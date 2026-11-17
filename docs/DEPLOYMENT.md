# Deployment & DevOps Guide

## Docker Compose Deployment

Configure `.env` with strong secrets (`POSTGRES_PASSWORD`, `JWT_SECRET`), then build and launch the full stack:

```bash
docker compose up -d --build
```

Services started:
- `postgres`: PostgreSQL 17 with persistent volume and `pg_isready` health check.
- `api`: ASP.NET Core `.NET 10` Web API on port `8080` with `/api/v1/health` probe.
- `frontend`: Nginx serving the optimized production React bundle on port `3000`.

## Supabase PostgreSQL Setup (`rbuuelqczoshuxlslxlj`)

1. Open your [Supabase SQL Editor](https://supabase.com/dashboard/project/rbuuelqczoshuxlslxlj/sql/new) and run `supabase/migrations/001_portfolio_schema_and_seed.sql` to create all normalized tables, Row Level Security (RLS) policies, and verified resume seed data.
2. In `.env` (or AI Studio Secrets), set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and optionally `SUPABASE_SECRET_KEY` for server-side admin writes.
3. For the ASP.NET Core (`.NET 10`) backend, set `ConnectionStrings__DefaultConnection` to your Supabase PostgreSQL connection string (`Host=db.rbuuelqczoshuxlslxlj.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=YOUR_DB_PASSWORD;SSL Mode=Require;Trust Server Certificate=true`).

## Hosting Recommendations

- **Frontend**: Vercel, Cloudflare Pages, or Docker/Nginx behind HTTPS reverse proxy (Caddy/Traefik/Cloudflare).
- **ASP.NET Core API**: Azure Container Apps, AWS ECS/Fargate, Fly.io, or Railway using `backend/Dockerfile.api`.
- **PostgreSQL**: Supabase PostgreSQL (`rbuuelqczoshuxlslxlj`) or managed PostgreSQL with SSL enforced.
- **CI/CD**: `.github/workflows/ci-cd.yml` validates TypeScript, Vitest, Vite production build, and `dotnet build` / `dotnet test` on every push and pull request.

