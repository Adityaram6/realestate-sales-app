# Real Estate Sales App

AI-powered real estate CRM and sales pipeline system.

## Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Query, Zustand
- **Backend** (planned): NestJS + Prisma + PostgreSQL
- **Infra** (planned): AWS (RDS, S3, CloudFront, EC2/ECS)

## Structure

```
apps/
  web/              Next.js frontend
  api/              NestJS backend (not yet scaffolded)
packages/
  shared/           Shared TS types and enums
```

## Getting started

```bash
pnpm install
pnpm dev            # starts web at http://localhost:3000
```

### Mock mode

Set `NEXT_PUBLIC_USE_MOCK=true` in `apps/web/.env.local` to bypass the real API and return in-memory fixtures. On by default in development.

## Phase 1 scope

EPICs 1–8 (Projects/Properties, Leads, Opportunities, Bidirectional views, Pipeline, AI Assistant, Communication, Notifications) + DPDP consent. Marketing (EPIC 10), SMS, and Telugu language are deferred.
