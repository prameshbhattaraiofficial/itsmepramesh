-- =============================================================================
-- Products & Orders E-Commerce Extension for Supabase PostgreSQL
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/rbuuelqczoshuxlslxlj/sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.products (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  short_description TEXT NOT NULL,
  full_description TEXT NOT NULL,
  price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_npr NUMERIC(10, 2) NOT NULL DEFAULT 0,
  compare_at_usd NUMERIC(10, 2),
  sku TEXT NOT NULL,
  inventory_count INTEGER NOT NULL DEFAULT 100,
  is_digital BOOLEAN NOT NULL DEFAULT TRUE,
  image_url TEXT,
  delivery_info TEXT NOT NULL DEFAULT 'Instant digital download link sent via email upon confirmation.',
  features_json TEXT NOT NULL DEFAULT '[]',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id BIGSERIAL PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT,
  payment_method TEXT NOT NULL,
  payment_provider TEXT,
  transaction_uuid TEXT,
  provider_ref_id TEXT,
  paid_at TIMESTAMPTZ,
  currency TEXT NOT NULL DEFAULT 'USD',
  total_amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  items_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_provider TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS transaction_uuid TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider_ref_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_tx_uuid ON public.orders(transaction_uuid);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies
DROP POLICY IF EXISTS "Public read active products" ON public.products;
CREATE POLICY "Public read active products"
  ON public.products FOR SELECT
  USING (is_deleted = FALSE AND is_active = TRUE);

DROP POLICY IF EXISTS "Public submit order" ON public.orders;
CREATE POLICY "Public submit order"
  ON public.orders FOR INSERT
  WITH CHECK (TRUE);

-- Starter Editable Products Seed (customize or replace via Admin Dashboard)
INSERT INTO public.products (
  title, slug, category, short_description, full_description,
  price_usd, price_npr, compare_at_usd, sku, inventory_count,
  is_digital, image_url, delivery_info, features_json, featured, is_active, display_order
) VALUES
(
  'ASP.NET Core 10 Clean Architecture Starter Kit',
  'aspnet-core-10-clean-architecture-kit',
  'Backend Kits',
  'Production-structured .NET 10 Web API solution featuring JWT + refresh rotation, RBAC authorization, SQL repository patterns, and unit tests.',
  'A ready-to-customize ASP.NET Core 10 Clean Architecture template built from real-world backend engineering practices. Includes Domain, Application, Infrastructure, and API layers, SQL migration patterns, Swagger/OpenAPI wiring, and automated unit tests.',
  49.00,
  6500.00,
  79.00,
  'PB-NET10-KIT',
  999,
  TRUE,
  NULL,
  'Instant digital download + private Git access instructions sent to your email.',
  '["Clean Architecture multi-project .NET 10 solution","JWT access & refresh token rotation with RBAC","Repository & Service Layer abstractions with validation","Dockerfiles, GitHub Actions CI/CD, and xUnit test suite"]',
  TRUE,
  TRUE,
  1
),
(
  'Full-Stack React + TypeScript Portfolio & CMS Kit',
  'react-typescript-portfolio-cms-kit',
  'Web Templates',
  'Editorial dark/light React 19 + Tailwind v4 frontend paired with an Express/Supabase/SQLite CMS, Admin Dashboard, and TanStack Query.',
  'Complete full-stack storefront and developer portfolio boilerplate with JWT-protected Admin CMS, media uploads, contact inbox, dark/light theme persistence, and strict TypeScript contracts.',
  39.00,
  5200.00,
  59.00,
  'PB-REACT-CMS',
  999,
  TRUE,
  NULL,
  'Instant source archive download link delivered via email after order confirmation.',
  '["React 19 + TypeScript + Tailwind CSS v4 dual-theme UI","Admin CMS dashboard with CRUD management and audit logs","PostgreSQL / Supabase and SQLite database schemas","Vitest component and form test suite included"]',
  TRUE,
  TRUE,
  2
),
(
  '1-on-1 System Architecture & SQL Code Review',
  'system-architecture-sql-code-review',
  'Consulting Packs',
  '90-minute live technical review of your .NET API, React frontend, or SQL Server/PostgreSQL database queries with written action notes.',
  'Direct engineering consultation covering API service layer structure, stored procedure or query performance bottlenecks, security hardening, and deployment architecture.',
  99.00,
  13200.00,
  NULL,
  'PB-ARCH-90M',
  20,
  TRUE,
  NULL,
  'Calendar booking link and session prep checklist delivered via email within 24 hours.',
  '["90-minute live engineering review session","SQL query & stored procedure optimization feedback","API boundary validation and error-handling audit","Written prioritized refactoring roadmap PDF"]',
  FALSE,
  TRUE,
  3
)
ON CONFLICT (slug) DO NOTHING;
