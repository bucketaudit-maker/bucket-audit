import { Router } from "express";
import { requireAuth } from "../mw/auth";
import { prisma } from "../index";

export const devRouter = Router();
devRouter.use(requireAuth);

devRouter.post("/seed-bucket", async (req, res) => {
  const { orgId } = (req as any).auth;

  // create a fake account + bucket
  const acct = await prisma.cloudAccount.create({
    data: {
      orgId,
      provider: "aws",
      displayName: "demo",
      roleArn: "arn:aws:iam::000000000000:role/Demo"
    }
  });

  const bucket = await prisma.bucket.create({
    data: {
      orgId,
      accountId: acct.id,
      name: "demo-public-bucket",
      region: "us-east-1"
    }
  });

  await prisma.finding.create({
    data: {
      bucketId: bucket.id,
      severity: "high",
      type: "POLICY_PUBLIC",
      status: "open",
      details: { note: "demo finding" }
    }
  });

  // index to OpenSearch
  await fetch(`${process.env.OPENSEARCH_URL}/buckets_v1/_doc/${bucket.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      orgId,
      bucketId: bucket.id,
      accountId: acct.id,
      name: bucket.name,
      region: bucket.region,
      isPublic: true,
      severity: "high",
      findingTypes: ["POLICY_PUBLIC"],
      lastSeenAt: new Date().toISOString()
    })
  });

  res.json({ ok: true, bucketId: bucket.id });
});
