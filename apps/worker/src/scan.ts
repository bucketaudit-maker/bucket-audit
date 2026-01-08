import { PrismaClient } from "@prisma/client";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import {
  S3Client,
  ListBucketsCommand,
  GetPublicAccessBlockCommand,
  GetBucketPolicyStatusCommand,
  GetBucketAclCommand,
  GetBucketLocationCommand,
  GetBucketWebsiteCommand
} from "@aws-sdk/client-s3";

const prisma = new PrismaClient();
const INDEX = "buckets_v1";

type AwsCreds = { accessKeyId: string; secretAccessKey: string; sessionToken: string };

async function assumeRole(roleArn: string, externalId?: string): Promise<AwsCreds> {
  const sts = new STSClient({});
  const out = await sts.send(new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: "exposure-monitor",
    ExternalId: externalId
  }));
  const c = out.Credentials!;
  return { accessKeyId: c.AccessKeyId!, secretAccessKey: c.SecretAccessKey!, sessionToken: c.SessionToken! };
}

function evaluateExposure(input: { bpa?: any; policyStatus?: any; acl?: any; website?: any; }) {
  const findings: Array<{ type: string; severity: string; details: any }> = [];

  const bpa = input.bpa?.PublicAccessBlockConfiguration;
  if (bpa) {
    const risky =
      bpa.BlockPublicAcls === false ||
      bpa.IgnorePublicAcls === false ||
      bpa.BlockPublicPolicy === false ||
      bpa.RestrictPublicBuckets === false;
    if (risky) findings.push({ type: "BPA_DISABLED", severity: "med", details: { bpa } });
  }

  const isPolicyPublic = input.policyStatus?.PolicyStatus?.IsPublic === true;
  if (isPolicyPublic) findings.push({ type: "POLICY_PUBLIC", severity: "high", details: { policyStatus: input.policyStatus } });

  const grants = input.acl?.Grants || [];
  const aclPublic = grants.some((g: any) => {
    const uri = g?.Grantee?.URI || "";
    return uri.includes("AllUsers") || uri.includes("AuthenticatedUsers");
  });
  if (aclPublic) findings.push({ type: "PUBLIC_ACL", severity: "high", details: { grants } });

  if (input.website) findings.push({ type: "WEBSITE_PUBLIC", severity: "med", details: { website: true } });

  const isPublic = findings.some(f => ["high", "critical"].includes(f.severity));
  const maxSeverity = findings.reduce((acc, f) => {
    const order: any = { low: 1, med: 2, high: 3, critical: 4 };
    return order[f.severity] > order[acc] ? f.severity : acc;
  }, "low");

  return { findings, isPublic, maxSeverity };
}

async function indexBucket(doc: any) {
  const base = process.env.OPENSEARCH_URL!;
  await fetch(`${base}/${INDEX}/_doc/${doc.bucketId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(doc)
  });
}

export async function runFullScan() {
  const accounts = await prisma.cloudAccount.findMany({ where: { isActive: true, provider: "aws" } });

  for (const acct of accounts) {
    const creds = await assumeRole(acct.roleArn, acct.externalId || undefined);
    const s3 = new S3Client({ credentials: creds });

    const list = await s3.send(new ListBucketsCommand({}));
    const buckets = list.Buckets || [];

    for (const b of buckets) {
      const name = b.Name!;
      const regionResp = await s3.send(new GetBucketLocationCommand({ Bucket: name })).catch(() => null);
      const region = regionResp?.LocationConstraint || "us-east-1";

      const bpa = await s3.send(new GetPublicAccessBlockCommand({ Bucket: name })).catch(() => null);
      const policyStatus = await s3.send(new GetBucketPolicyStatusCommand({ Bucket: name })).catch(() => null);
      const acl = await s3.send(new GetBucketAclCommand({ Bucket: name })).catch(() => null);
      const website = await s3.send(new GetBucketWebsiteCommand({ Bucket: name })).catch(() => null);

      const { findings, isPublic, maxSeverity } = evaluateExposure({ bpa, policyStatus, acl, website });

      const bucketRow = await prisma.bucket.upsert({
        where: { accountId_name: { accountId: acct.id, name } },
        update: { region: String(region), lastSeenAt: new Date() },
        create: { orgId: acct.orgId, accountId: acct.id, name, region: String(region) }
      });

      // MVP: append findings; production should dedupe by (bucketId,type)
      for (const f of findings) {
        await prisma.finding.create({
          data: { bucketId: bucketRow.id, type: f.type, severity: f.severity, details: f.details }
        });
      }

      await indexBucket({
        orgId: acct.orgId,
        bucketId: bucketRow.id,
        accountId: acct.id,
        name,
        region,
        isPublic,
        severity: maxSeverity,
        findingTypes: findings.map(x => x.type),
        lastSeenAt: new Date().toISOString()
      });
    }
  }
}
