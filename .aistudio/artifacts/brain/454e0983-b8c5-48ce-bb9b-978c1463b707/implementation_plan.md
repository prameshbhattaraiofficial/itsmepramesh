# Pramesh Bhattarai — Personal Developer Portfolio & Extensible Platform

A dark-editorial personal portfolio, content management dashboard, and Clean Architecture backend representing Pramesh Bhattarai (.NET Developer, 5+ years of experience in Kathmandu, Nepal), built with a live React + TypeScript + Node/Express runtime for immediate preview alongside a complete ASP.NET Core (.NET 10 LTS) Clean Architecture solution, PostgreSQL/EF Core schema, Docker setup, and modular e-commerce extension points.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Verified Resume Data Only (Zero Invention Policy)**: All identity details, career history, education, certifications, languages, references, and skills are extracted strictly from `Pramesh_Bhattarai__1__3a748bfe.pdf`. Because your resume does not list named personal/client project URLs or written client testimonials, those sections will be seeded with clearly marked **editable placeholder entries** in the database so you can replace or publish them directly from the Admin Dashboard without touching source code.

- **Confirmed Backend Strategy**: Live Node.js/Express REST API (`/api/v1/*`) with persistent SQLite storage for immediate working preview and Admin CMS editing in this environment, paired with the complete ASP.NET Core (.NET 10 LTS) Clean Architecture solution (Domain, Application, Infrastructure, API, Shared, and Unit/Integration Tests) + Swagger/OpenAPI + Docker Compose for production deployment.
- **Confirmed Resume Source**: Extracted from your uploaded Merojob resume PDF (`Pramesh_Bhattarai__1__3a748bfe.pdf`), including direct CV download support for that PDF.
- **Confirmed Aesthetic & Module Scope**: Dark editorial minimalism as the primary theme (with persisted light/dark mode switching), and the Blog module initially disabled via a database-backed site setting toggleable in Admin.

---

## 1. Resume Analysis & Verified Content Model

### Extracted Profile & Identity
- **Name**: Pramesh Bhattarai
- **Headline**: .NET Developer · Backend & Full-Stack Software Engineer
- **Experience Span**: 5 years, 6 months (March 2021 – Present)
- **Location**: Kapan, Kathmandu, Nepal (Permanent: Sindhupalchowk, Tinghare)
- **Contact**: `prameshbhattaraiofficial@gmail.com` · `+977 9863439135` · `+977 9709166318`
- **Social Links**: LinkedIn (`in/prameshbhattaraiofficial`), GitHub (`github.com/prameshbhattaraiofficial`, `github.com/codingwithpramesh`)
- **Career Objective**: Experienced .NET Developer aiming to contribute to system architecture, API development, and optimization processes while mentoring junior developers and delivering robust enterprise solutions.
- **Availability**: Open to Full-Time, Freelance, Part-Time, and Temporary engagements (Mid-Level).
- **Languages**: English (Good), Nepali (Good).

### Verified Work Experience (Vertical Timeline)
1. **Mypay** *(Smart Card Nepal Pvt. Ltd. / Big Solution Pvt. Ltd.)* — Bhaktapur · *Feb 2024 – Present (2 yrs 9 mos)* — **Dotnet Developer**
   - Designed and implemented web services using .NET Web API and .NET validation controls.
   - Authored SQL statements and stored procedures; built new applications from scratch while maintaining existing production systems to improve client satisfaction.
2. **Microcode Technologies** — Shankhamul · *Jun 2023 – Feb 2024 (8 mos)* — **Dotnet Developer**
   - Built custom web applications and maintained existing systems to enhance functionality and user experience.
   - Collaborated across teams to hit delivery milestones, assisted peers with debugging, and authored SQL statements and stored procedures.
3. **Texas Imaginology** — Sifal, Kathmandu · *Mar 2021 – Apr 2023 (2 yrs 1 mo)* — **Dotnet Developer**
   - Architected REST web services in C# using a Service Layer pattern; worked directly with clients and mentored peers.
   - Conducted unit testing resulting in a **25% decrease in bugs**; authored SQL statements and stored procedures.

### Verified Education, Training & Reference
- **Education**: Bachelor of Information Technology (BIT), **CGPA 3.74** — Texas International College, Kathmandu (Lincoln University, Malaysia), April 2023.
- **Training / Certificate**: Flutter (6 Months) — IT Institution, June 2023.
- **Reference**: Smart Card Nepal Pvt. Ltd. (Big Solution Pvt. Ltd.) — MyPay.

### Verified Skills (Categorized Without Fabricated Scores)
- **Backend & APIs**: C#, ASP.NET MVC, .NET Web API, REST API, MVC, Python, Django Framework
- **Frontend & Data Interchange**: React, Ajax, JSON
- **Databases**: SQL, Oracle, DBMS
- **Engineering & Collaboration**: Git, Jira, Problem-Solving Skills, Supervision

---

## 2. User Experience & Visual Design

### Visual Identity & Theme System
- **Aesthetic Direction**: Dark editorial minimalism inspired by Linear, Vercel, and Stripe—clean spatial hierarchy, generous whitespace, hairline dividers (`1px`), and single-elevation surfaces without card-within-card nesting.
- **Color Tokens (`60-30-10` Budget)**:
  - *Dark Mode (Primary)*: `#050505` / `#09090B` neutral canvas (60%), `#111114` structural surface with `#27272A` hairline borders (30%), and `#3B82F6` / `#2563EB` electric cobalt focal accent (10%).
  - *Light Mode (Persisted Toggle)*: `#FAFAFA` canvas, `#FFFFFF` surface with `#E4E4E7` hairline borders, `#09090B` primary ink, `#2563EB` accent. Implemented cleanly with Tailwind v4 `@custom-variant dark` and semantic CSS tokens.
- **Typography (`2+1` Pairing)**:
  - *Display & Headings*: `Plus Jakarta Sans` (tight tracking, `text-wrap: balance` to eliminate orphan headline words).
  - *Body Prose*: `DM Sans` (15–16px, 1.65 line-height, 65–75ch measure).
  - *Dates, Metrics & Code*: `JetBrains Mono` with `tabular-nums`.
- **Anti-Slop Discipline**: Metadata uses clean unboxed text with `·` separators instead of pill badges; interactive filter controls use crisp segmented buttons; no decorative pulsing status dots, thick left accent borders, or fabricated skill percentages.

### Key User Flows
1. **Public Visitor Flow**:
   - **3-Zone Top Bar**: Wordmark (`Pramesh Bhattarai`), 4–5 single-line nav links (`About`, `Experience`, `Projects`, `Services`, `Contact` — plus `Blog` only when enabled in Admin), and 1 primary CTA (`Get in Touch`), with theme switcher and mobile menu drawer kept clean and compact.
   - **Hero Split**: Left column displays verified role, headline, concise objective, `Download CV` (serving your real PDF), `Contact Me`, and LinkedIn/GitHub links; right column presents a refined portrait frame (uploadable in Admin with crisp initial fallback) and subtle Framer Motion entrance animations; full-width factual career summary strip directly beneath (`5+ Years Experience`, `3.74 BIT CGPA`, `25% Bug Reduction via Unit Testing`, `Kathmandu, Nepal`).
   - **About, Skills & Timeline**: Categorized technical skills grid, vertical chronological experience timeline with verified impact bullets, and Education + Flutter certification cards.
   - **Projects Showcase & Detail Route**: Category/technology segmented filters + search, project cards leading to dedicated `/projects/:slug` detail views, seeded with clearly flagged editable placeholder case studies aligned with your resume domains until you publish your repositories/demos.
   - **Services, Reference & Contact**: Resume-grounded services (`REST API & Backend Architecture`, `Full-Stack Web Applications`, `Database & Stored Procedure Optimization`, `Application Maintenance & Debugging`), reference showcase, and validated contact form with server-side sanitization, rate limiting, and toast feedback.
2. **Admin CMS Flow (`/admin`)**:
   - Protected by JWT authentication with refresh token rotation and `Admin` role verification.
   - Sidebar workspace managing Overview metrics, Profile & CV upload, Projects CRUD, Experience CRUD, Education/Certifications CRUD, Skills & Categories CRUD, Services CRUD, Testimonials CRUD, Blog Posts & Feature Toggle (`enableBlog`), Contact Messages Inbox, Media Library upload, SEO Settings, and immutable Admin Audit Logs.

---

## 3. Key Product Decisions & Trade-Offs

- **Dual-Target Backend (Live Express API + Complete .NET 10 Solution)**
  - *Chosen Approach*: Implement a full REST API (`/api/v1/*`) in Express backed by SQLite (`better-sqlite3`) so the React frontend, TanStack Query cache, Axios interceptors, JWT auth, and Admin CMS work end-to-end immediately in the live preview, while generating the production ASP.NET Core (.NET 10 LTS) Clean Architecture solution (`Domain`, `Application`, `Infrastructure`, `API`, `Shared`, `Tests`), EF Core PostgreSQL configurations, Swagger/OpenAPI setup, and Docker Compose files in `/backend`.
  - *Why*: This runtime runs Node.js v22 without the .NET SDK; delivering both guarantees an immediately testable full-stack app today and a true .NET 10 + PostgreSQL deployment target.
  - *Alternatives Considered*: Frontend-only mocks (rejected—fails real Admin CRUD, auth, and contact persistence requirements).
- **Zero-Fabrication Placeholder Transparency**
  - *Chosen Approach*: Seed missing resume items (named project case studies and client testimonials) with explicit `[Editable Template]` indicators visible in Admin and clean professional copy on the storefront, never inventing fake employers, metrics, or GitHub URLs.
  - *Why*: Preserves resume integrity as the single source of truth while giving you an immediately polished layout ready for your real links.
- **Modular Future E-Commerce Boundary**
  - *Chosen Approach*: Keep e-commerce UI and payment SDK dependencies completely inactive in the initial release, while defining domain extension interfaces (`IPaymentGateway`, `IOrderFulfillmentService`), future schema blueprints (`Product`, `ProductCategory`, `Cart`, `Order`, `OrderItem`, `Coupon`, `PaymentTransaction`, `Invoice`), and Strategy Pattern stubs for `EsewaPaymentGateway`, `KhaltiPaymentGateway`, and `StripePaymentGateway` with server-side verification contracts.
  - *Why*: Avoids bloat and premature checkout UI while letting you enable digital/service commerce later without refactoring core layers.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   React 19 + TypeScript + Vite Frontend                 │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────────────────┐  │
│  │ Public Views │  │ Project Detail │  │ Admin CMS (/admin/*)        │  │
│  │ Hero/Bio/CV  │  │ & Blog (Flag)  │  │ Auth Guard · CRUD · Media   │  │
│  └──────┬───────┘  └───────┬────────┘  └──────────────┬──────────────┘  │
│         └──────────────────┴──────────────────────────┘                 │
│                            │ TanStack Query + Axios (JWT Interceptor)   │
└────────────────────────────┼────────────────────────────────────────────┘
                             ▼  REST /api/v1/*
┌─────────────────────────────────────────────────────────────────────────┐
│           Live Sandbox API (Express + SQLite + JWT + Rate Limit)        │
│   Public Endpoints: /profile, /skills, /experiences, /education,        │
│                     /projects, /services, /testimonials, /blog, /contact│
│   Auth & Admin:     /auth/login, /auth/refresh, /admin/* (RBAC + Audit) │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│        Production .NET 10 LTS Clean Architecture Solution (/backend)    │
│  ┌───────────────┐   ┌────────────────┐   ┌──────────────────────────┐  │
│  │ Portfolio.API │──▶│ Portfolio.App  │──▶│ Portfolio.Domain         │  │
│  │ Controllers   │   │ CQRS/DTOs/Val  │   │ Entities · ValueObjects  │  │
│  │ JWT · Swagger │   │ Map · MediatR  │   │ IPaymentGateway (Future) │  │
│  └───────┬───────┘   └────────────────┘   └────────────▲─────────────┘  │
│          │                                             │                │
│          ▼           ┌─────────────────────────────┐   │                │
│          └──────────▶│ Portfolio.Infrastructure    │───┘                │
│                      │ EF Core · PostgreSQL · Auth │                    │
│                      │ Storage · AuditLog · Email  │                    │
│                      └─────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Core Relational Data Model
- **Identity & Security**: `User`, `RefreshToken` (token rotation & revocation), `AuditLog` (admin action trail).
- **Portfolio Core**: `Profile` (bio, CV path, contact, SEO metadata, `blogEnabled` feature flag), `SkillCategory` ↔ `Skill`, `Experience` (company, role, dates, bullets, stack), `Education`, `Certification`, `Project` ↔ `ProjectTechnology`, `Service`, `Testimonial`, `ContactMessage`, `MediaFile`.
- **Blog Module (Disabled by Default)**: `BlogCategory`, `BlogTag`, `BlogPost` (slug, SEO meta, featured image, publish status).
- **Future E-Commerce Blueprint (Isolated)**: `Product`, `ProductCategory`, `ProductImage`, `ShoppingCart`, `CartItem`, `Order`, `OrderItem`, `Inventory`, `Coupon`, `PaymentTransaction` (idempotency key, provider reference, verified amount), `ShippingAddress`, `Invoice`.

### Interactive Component & State Mapping
- **Theme Switcher**: Persists `dark` / `light` class on `<html>` in `localStorage`, defaulting to dark mode.
- **Projects Filter & Detail Flow**: Segmented category/technology filter controls + search query drive TanStack Query `GET /api/v1/projects?category=&tech=&search=&page=` with loading skeletons and empty-state reset; clicking a card opens `/projects/:slug`.
- **Contact Submission**: Client + server validation (Zod / FluentValidation) submits `POST /api/v1/contact` with rate limiting and renders instant accessible toast notifications.
- **Admin CMS Mutations**: Axios attaches short-lived JWT access tokens and automatically refreshes expired tokens via `POST /api/v1/auth/refresh`; all CRUD mutations invalidate TanStack Query keys and append an entry to `AuditLog`.

### Verification & Delivery Plan
- **Frontend**: Component, validation, and flow tests (`Vitest` + React Testing Library), production `vite build`, and TypeScript check.
- **Backend**: xUnit domain, application, and API integration tests for the .NET 10 solution + live Express API endpoint verification in the running preview.
- **DevOps & Docs**: Multi-stage `Dockerfile`s for frontend & API, `docker-compose.yml` (React + ASP.NET Core API + PostgreSQL + health checks), GitHub Actions CI/CD workflow, environment variable templates, and Architecture + Future E-Commerce (eSewa / Khalti / Stripe) integration documentation.
