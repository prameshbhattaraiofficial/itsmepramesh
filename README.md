# Pramesh Bhattarai — Personal Portfolio & Extensible Platform

Production-ready personal software engineering portfolio for **Pramesh Bhattarai** (Full-Stack Software Engineer, Kathmandu, Nepal), built from verified resume data with zero invented credentials.

## Architecture Overview

1. **Frontend (`src/`)**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui primitives + Framer Motion + Axios (with JWT Refresh Token Rotation interceptor) + TanStack Query.
2. **Live Sandbox API (`server/` & `server.ts`)**: Express + SQLite REST API (`/api/v1/*`), JWT + refresh token rotation, role-based Admin guard, rate limiting, media upload, `robots.txt`, and dynamic `sitemap.xml`.
3. **Production Backend (`backend/`)**: Complete ASP.NET Core Web API (`.NET 10 LTS`) following Clean Architecture (`Domain`, `Application`, `Infrastructure`, `API`, `Shared`, `UnitTests`) with EF Core + PostgreSQL, ASP.NET Core Identity + JWT, FluentValidation, Swagger/OpenAPI, and isolated Future E-Commerce Strategy abstractions (`IPaymentGateway` for eSewa, Khalti, and Stripe).

## Local Setup (Live Full-Stack Preview)

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:3000`.
Admin Portal: `/admin` (sign in using `ADMIN_EMAIL` and `ADMIN_PASSWORD` configured in `.env`).

## Running Tests

```bash
npm run lint
npm test
npm run build
```

For the `.NET 10` backend (with .NET 10 SDK installed):

```bash
dotnet test backend/Portfolio.sln
```

## Documentation

- [Architecture Guide](docs/ARCHITECTURE.md)
- [Deployment & DevOps Guide](docs/DEPLOYMENT.md)
- [Future E-Commerce Integration Roadmap](docs/ECOMMERCE_ROADMAP.md)
