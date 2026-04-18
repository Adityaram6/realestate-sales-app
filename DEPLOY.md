# Deploy

**Frontend:** Vercel · **Backend + Postgres + Redis + BullMQ workers:** Railway

One-time setup then every `git push` redeploys both.

---

## 0. Prereqs (5 min)

- [Vercel account](https://vercel.com/signup) + `npm i -g vercel` (optional, CLI)
- [Railway account](https://railway.com/) + `npm i -g @railway/cli` (optional, CLI)
- GitHub repo with this code pushed
- Docker is **not** required. See step 1 for the no-Docker path.

---

## 1. Database schema bootstrap — pick one

Railway needs to set up the Postgres schema on first deploy. [`apps/api/scripts/deploy-db.sh`](apps/api/scripts/deploy-db.sh) picks automatically:

- **No migrations committed →** runs `prisma db push` (direct schema sync from `schema.prisma`)
- **Migrations folder has content →** runs `prisma migrate deploy` (replays committed migrations)

### Path A: No Docker, no migrations (fastest — recommended for first deploy)

**Skip this section entirely.** Railway will `db push` the schema on first deploy, which creates every table from `schema.prisma` directly. Switch to proper migrations later when you have Docker or a hosted dev DB.

### Path B: Proper migrations from day 1 (requires Docker or any dev Postgres)

```bash
# If you have Docker:
pnpm run db:up

# Or point at any remote Postgres (e.g. a throwaway Railway Postgres):
export DATABASE_URL="postgresql://..."

# Generate the migration
cd apps/api
pnpm prisma migrate dev --name init

# Commit + push
cd ../..
git add apps/api/prisma/migrations
git commit -m "chore: initial prisma migration"
git push
```

From here on, every schema change: `pnpm prisma migrate dev --name <change>`, commit, push.

---

## 2. Deploy backend to Railway (~15 min)

### 2a. Create Railway project

1. Railway dashboard → **New Project** → **Deploy from GitHub repo**
2. Pick this repo. Railway detects the root `railway.json` and the build/start commands.
3. It'll fail on first deploy because no DB yet — that's expected.

### 2b. Add Postgres + Redis

In the Railway project:
1. **+ New** → **Database** → **Add PostgreSQL**
2. **+ New** → **Database** → **Add Redis**

They get provisioned with internal URLs you'll reference from the app service.

### 2c. Set env vars on the api service

In the api service → **Variables** tab, paste from `apps/api/.env.production.example`. Key bits:

```
NODE_ENV=production
PORT=${{ PORT }}
API_PREFIX=api
DATABASE_URL=${{ Postgres.DATABASE_URL }}
REDIS_HOST=${{ Redis.REDISHOST }}
REDIS_PORT=${{ Redis.REDISPORT }}
REDIS_PASSWORD=${{ Redis.REDISPASSWORD }}
JWT_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32 — different value>
CORS_ORIGIN=https://<your-vercel-app>.vercel.app
USE_MOCK_AI=true
```

Generate strong secrets:
```bash
openssl rand -hex 32    # run twice, one per JWT secret
```

Leave `CORS_ORIGIN` as a placeholder — you'll update it after Vercel deploys.

### 2d. Trigger deploy

Click **Redeploy** on the api service. Expected log sequence:

```
Nixpacks → pnpm install → prisma:generate → nest build
→ prisma migrate deploy   (applies the init migration)
→ node dist/main.js
→ Prisma connected
→ API up on http://localhost:<PORT>/api
```

Healthcheck hits `/api/health` and must return 200 with `{ status: "ok", db: "up" }`.

### 2e. Grab your Railway URL

Service → **Settings** → **Networking** → **Generate Domain**. Copy the URL, e.g. `https://realty-api.up.railway.app`.

### 2f. Seed demo data (one-time)

```bash
railway login
railway link   # pick the project + service
railway run --service api pnpm --filter api db:seed
```

Expected output:
```
🌱 Seeding database…
  ✓ Users (Priya Admin, Ravi Manager, Sita Sales)
  ✓ Projects (3)
  ✓ Properties (4)
  ✓ Leads (4)
  ✓ Opportunities (5) + stage history
  ✓ Activities, messages, tasks
  ✓ Pipeline stages + integrations
  ✓ Marketing campaigns (2)
✅ Seed complete. Demo logins (password: "password"):
   admin@demo.com · manager@demo.com · sales@demo.com
```

---

## 3. Deploy frontend to Vercel (~5 min)

### 3a. Create Vercel project

1. Vercel dashboard → **Add New → Project**
2. Import the same GitHub repo
3. **Root Directory**: `apps/web`
4. **Framework preset**: Next.js (auto-detected)
5. Build/install commands: **leave default** — the root `vercel.json` handles it

### 3b. Environment variables

Settings → **Environment Variables**:

```
NEXT_PUBLIC_API_URL=https://<your-railway-url>.up.railway.app/api
NEXT_PUBLIC_USE_MOCK=false
```

Optional for preview/demo without backend:
```
# Only in Preview environment
NEXT_PUBLIC_USE_MOCK=true
```
This lets PR previews work offline with in-memory fixtures — handy for UI reviews.

### 3c. Deploy

Click **Deploy**. First build takes ~2 min.

### 3d. Copy the Vercel URL back to Railway CORS

Take your Vercel URL (e.g. `https://realty-crm.vercel.app`) and update `CORS_ORIGIN` on the Railway api service. Redeploy the api service so the change takes effect.

---

## 4. Verify

Hit your Vercel URL. You should land on `/login`. Try:

- Log in as `admin@demo.com` / `password`
- Dashboard loads with 4 stat cards + recent activity
- Create a new lead → AI panel renders (mock mode until you set `ANTHROPIC_API_KEY`)
- Attach a project → opportunity appears on the pipeline
- Drag it to Negotiation → stage history updates

Check Railway logs for: request log lines from `[HTTP]`, BullMQ worker starts, Prisma queries. No `Redis connect failed` or `Prisma connection refused`.

---

## 5. Going fully live

### Switch to real Claude

Railway → api → Variables:
```
USE_MOCK_AI=false
ANTHROPIC_API_KEY=sk-ant-...
```
Redeploy. Check `POST /api/ai/generate-message` response — `modelUsed` should read `claude-sonnet-4-5`, not `mock-sonnet`. Token usage goes into `ai_interactions` + the per-user rate limiter.

### Connect real WhatsApp / Email / SMS

Settings → Integrations tab (as admin). Paste:
- **WhatsApp**: Meta Cloud API phone number ID + business account ID + access token
- **Email**: SMTP host/port/from/username
- **SMS**: MSG91 auth key + DLT-approved sender ID + template ID

The `MessagesService.send` path picks these up on next request. No redeploy needed.

### Connect social accounts

Settings → Social accounts (admin). Paste Meta / LinkedIn long-lived tokens from the respective developer consoles. Real publishing remains stubbed until Meta Business Verification approves your app (4–8 weeks). Schema + endpoints are ready — only the Graph API call body needs uncommenting in `apps/api/src/social/social.service.ts`.

---

## 6. Ongoing — every git push

```
git push origin main
```

- Railway rebuilds + runs `prisma migrate deploy` + restarts (zero-downtime rolling)
- Vercel rebuilds + ships (ignored if only `apps/api` changed — `vercel.json` `ignoreCommand` handles that)

Preview deploys happen on every PR automatically.

---

## Cost estimate

| Service | Free tier covers | Pay starts |
|---|---|---|
| Vercel Hobby | 100GB bandwidth, 6k build min/mo | Team plan $20/user/mo |
| Railway | $5 of compute/mo (Hobby plan $5/mo credit) | ~$5–15/mo for api + Postgres + Redis at low traffic |
| Anthropic | — | Pay-per-token, ~$3 per 1M input tokens on Sonnet 4.5 |

Under ~$20/mo to start. Scales linearly with usage.

---

## Troubleshooting

**Build fails with "Cannot find module '@realestate/shared'"**
→ pnpm workspace install didn't run from repo root. Check `installCommand` in `vercel.json` / `railway.json` is `pnpm install --frozen-lockfile` (not `pnpm --filter`).

**Railway startCommand fails at schema bootstrap**
→ If the log shows `prisma db push` failing: usually a `DATABASE_URL` issue or the Postgres service isn't linked. Check the Variables tab on the api service has `DATABASE_URL=${{ Postgres.DATABASE_URL }}`.
→ If the log shows `prisma migrate deploy` failing: you've committed migrations but one is broken. Check the latest migration SQL locally, or delete the migrations folder and let `db push` take over.

**Vercel build succeeds but runtime 500 on `/dashboard`**
→ `NEXT_PUBLIC_API_URL` missing or wrong. Check Vercel env vars. CORS rejection will show as a browser error, not a 500 — inspect Network tab.

**CORS errors in browser**
→ `CORS_ORIGIN` on Railway doesn't match your Vercel URL exactly (trailing slash matters). Update + redeploy api.

**BullMQ jobs never fire**
→ Redis env vars not wired. `railway run --service api redis-cli -u $REDIS_URL ping` should return `PONG`. Check `REDIS_HOST/PORT/PASSWORD` substitutions.

**`P2024: Timed out fetching a new connection from the connection pool`**
→ Railway Postgres default pool is small. Add `?connection_limit=10` to `DATABASE_URL`, or upgrade the Postgres plan for more connections.
