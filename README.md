# BucketAudit — Authorized Cloud Storage Exposure Audit

BucketAudit helps organizations **discover and reduce unintended public exposure** in cloud object storage (starting with AWS S3). It inventories buckets from **accounts you explicitly authorize**, evaluates common exposure signals (policies, ACLs, public access settings, website hosting), and provides a searchable UI + API for findings.

> ✅ **Authorized-only:** BucketAudit scans **only cloud accounts/buckets you own or have been granted permission to assess** (e.g., via cross-account role).  
> ❌ No internet-wide discovery or scanning.

---

## What it does (MVP)

### Inventory
- Lists buckets in authorized AWS accounts
- Stores bucket metadata in Postgres
- Indexes searchable bucket documents into OpenSearch

### Exposure checks (AWS S3)
- Bucket policy status indicates public access
- Bucket ACL grants to public groups (AllUsers / AuthenticatedUsers)
- Public Access Block (BPA) configuration is risky/disabled
- Bucket website hosting is enabled (signal of potential public content)

### Search & Visibility
- Search across your inventory via OpenSearch (fast filtering)
- UI shows buckets, severity, and detected exposure types
- API supports integrations and automation

---

## Architecture

**Web (Next.js)**  
- Simple UI for login + search + results

**API (Node.js + Express)**  
- JWT auth (dev-friendly; replace with SSO later)
- Stores orgs/accounts/buckets/findings in Postgres
- Queries OpenSearch for search endpoints

**Worker (Node.js + TypeScript)**  
- Scheduled scans (cron)
- Assumes authorized cross-account role in AWS
- Runs S3 posture checks and writes results to Postgres + OpenSearch

**Data**
- Postgres: system of record
- OpenSearch: search index for buckets

---

## Repo layout

```
apps/
  api/        Express API (JWT, Postgres, OpenSearch)
  worker/     Scheduled scanner (AWS role assumption + checks)
  web/        Next.js UI
packages/
  shared/     Shared types (optional expansion)
infra/
  aws/        Cross-account IAM role template for customers
docker-compose.yml
.env.example
```

---

## Local Development

### Prereqs
- Node.js 20+
- pnpm
- Docker

### 1) Install + start dependencies
```bash
pnpm install
cp .env.example .env
docker compose up -d
```

### 2) Run DB migrations
```bash
pnpm db:migrate
```

### 3) Start all services
```bash
pnpm dev
```

### URLs
- Web: http://localhost:3000
- API health: http://localhost:4000/health
- OpenSearch: http://localhost:9200

---

## Create a user (dev)

### Register
```bash
curl -s -X POST http://localhost:4000/auth/register \
  -H 'content-type: application/json' \
  -d '{"orgName":"Acme","email":"admin@acme.com","password":"ChangeMe123!"}'
```

### Login (get JWT)
```bash
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@acme.com","password":"ChangeMe123!"}' | jq -r .token)

echo "$TOKEN"
```

---

## Add an AWS Integration (Authorized)

### Customer-side cross-account role
A customer (or you) deploys the CloudFormation template:

- Template: `infra/aws/role.yaml`
- Output: Role ARN (and ExternalId if used)

This role is **read-only** for S3 posture checks.

### Add integration via API
```bash
curl -s -X POST http://localhost:4000/accounts \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{
    "provider":"aws",
    "displayName":"prod",
    "roleArn":"arn:aws:iam::<ACCOUNT_ID>:role/ExposureMonitorReadOnly",
    "externalId":"<OPTIONAL_EXTERNAL_ID>"
  }' | jq
```

---

## Search

### UI
Open http://localhost:3000 and use the Search box.

### API
```bash
curl -s "http://localhost:4000/search?q=$(python -c 'import urllib.parse; print(urllib.parse.quote(\"isPublic:true\"))')" \
  -H "authorization: Bearer $TOKEN" | jq
```

### Example queries (OpenSearch `query_string` syntax)
- `isPublic:true`
- `severity:high OR severity:critical`
- `findingTypes:POLICY_PUBLIC`
- `name:prod*`
- `region:us-east-1`

> Note: MVP uses `query_string` directly. In production, restrict to an allowlisted query DSL to avoid risky/expensive queries.

---

## Environment Variables

See `.env.example`

Key vars:
- `DATABASE_URL`
- `OPENSEARCH_URL`
- `JWT_SECRET`
- `API_PORT`
- `WORKER_SCAN_CRON`

---

## Security & Responsible Use

BucketAudit is intended for:
- Internal security teams
- Managed security service providers (MSSPs) operating under authorization
- Compliance/security monitoring for owned assets

Do not use this software to enumerate or analyze assets you do not own or have explicit permission to assess.

---

## Roadmap (practical next steps)

**v1.1**
- De-duplicate findings by `(bucketId, type)` and track `firstSeen/lastSeen`
- Finding lifecycle: open/resolved/ignored
- Audit log (who changed what)

**v1.2**
- Alerts: Slack/webhook/email
- Better multi-tenant controls & RBAC
- Account scoping by region / tags

**v2**
- Policy-as-code rules (OPA/Rego)
- Remediation suggestions (Terraform/CDK patch generation)
- Support GCP/Azure storage equivalents

---

## Contributing

PRs welcome. Please:
- Keep the scanner authorized-only
- Add tests for exposure evaluation logic
- Document any new AWS permissions added to the role template

---

## License

Add a license file if you plan to open source this project.
