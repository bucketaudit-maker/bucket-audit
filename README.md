# Exposure Monitor (authorized Bucket Exposure Audit)

A defensive, **authorized-only** Cloud Storage Exposure Monitor with a GrayhatWarfare-like search UX — but it scans **only cloud accounts/buckets you own or explicitly authorize** (no internet-wide scanning).

## Stack
- Node.js + TypeScript (API + Worker)
- Express (API)
- Next.js (Web)
- Postgres (source of truth)
- OpenSearch (search index)
- Prisma (migrations/models)
- Docker Compose (local infra)

## Quickstart (local)

### 1) Install
- Node 20+
- pnpm
- Docker

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm dev
```

### 2) Create an org + user
```bash
curl -s -X POST http://localhost:4000/auth/register \
  -H 'content-type: application/json' \
  -d '{"orgName":"Acme","email":"admin@acme.com","password":"ChangeMe123!"}' | jq
```

### 3) Login to get a token
```bash
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@acme.com","password":"ChangeMe123!"}' | jq -r .token)
echo $TOKEN
```

### 4) Add an AWS integration (authorized cross-account role)
```bash
curl -s -X POST http://localhost:4000/accounts \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"provider":"aws","displayName":"prod","roleArn":"arn:aws:iam::<ACCOUNT_ID>:role/ExposureMonitorReadOnly","externalId":"<OPTIONAL_EXTERNAL_ID>"}' | jq
```

### 5) Open the UI
- Web: http://localhost:3000
- API: http://localhost:4000/health
- OpenSearch: http://localhost:9200

## AWS cross-account role (customer side)
See `infra/aws/role.yaml`. The customer deploys it in their AWS account and shares the Role ARN (and ExternalId if used).

## Search examples
In the UI or via API:

- `isPublic:true`
- `severity:high OR severity:critical`
- `findingTypes:POLICY_PUBLIC`
- `name:prod*`

API endpoint:
```bash
curl -s "http://localhost:4000/search?q=$(python -c 'import urllib.parse; print(urllib.parse.quote("isPublic:true"))')" \
  -H "authorization: Bearer $TOKEN" | jq
```

## Push to GitHub (your account: bucketaudit-maker)

### Using GitHub CLI (recommended)
```bash
cd exposure-monitor
git init
git add .
git commit -m "Initial commit: exposure monitor"
gh repo create bucketaudit-maker/exposure-monitor --public --source=. --remote=origin --push
```

### Without GitHub CLI
1. Create a repo in GitHub UI under **bucketaudit-maker** (e.g., `exposure-monitor`)
2. Then:
```bash
cd exposure-monitor
git init
git add .
git commit -m "Initial commit: exposure monitor"
git branch -M main
git remote add origin https://github.com/bucketaudit-maker/exposure-monitor.git
git push -u origin main
```

## Notes (MVP)
- Findings are currently appended each scan for simplicity.
- For a production build, implement finding de-duplication, lifecycle (open/resolved/ignored), audit log, and field-allowlisted search DSL.
