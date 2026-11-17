-- Migration 003: Achievements table, Published Blog Articles, and Testimonials seed
-- Run in Supabase SQL Editor to sync achievements, blog articles, and testimonials directly in PostgreSQL.

CREATE TABLE IF NOT EXISTS public.achievements (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  metric_label TEXT,
  organization TEXT NOT NULL,
  achieved_date TEXT NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read achievements" ON public.achievements;
CREATE POLICY "Public read achievements"
  ON public.achievements
  FOR SELECT
  USING (is_deleted = FALSE);

-- Seed verified career & academic achievements (idempotent)
INSERT INTO public.achievements (title, category, metric_label, organization, achieved_date, description, display_order)
SELECT v.title, v.category, v.metric_label, v.organization, v.achieved_date, v.description, v.display_order
FROM (
  VALUES
    (
      '25% Reduction in Production Regression Defects',
      'Engineering Quality',
      '25% Fewer Bugs',
      'Texas Imaginology',
      '2021 – 2023',
      'Introduced systematic unit testing across C# Service Layer boundaries and validation pipelines, cutting reported production bugs by 25%.',
      1
    ),
    (
      '3.74 CGPA Academic Standing While Engineering Full-Time',
      'Academic Excellence',
      '3.74 CGPA',
      'Texas International College (Lincoln University)',
      'April 2023',
      'Completed Bachelor of Information Technology with distinction-level academic standing while delivering production .NET services full-time.',
      2
    ),
    (
      'Zero-Miss Concurrent Production & New System Delivery',
      'Production Delivery',
      '5+ Years Commercial',
      'Mypay (Smart Card Nepal Pvt. Ltd.)',
      '2024 – Present',
      'Designed and shipped new .NET Web API services and SQL Stored Procedures from scratch while maintaining live fintech-grade applications.',
      3
    ),
    (
      'Peer Mentorship & Collaborative Debugging Leadership',
      'Team Leadership',
      'Cross-Team Impact',
      'Microcode Technologies & Texas Imaginology',
      '2021 – 2024',
      'Mentored junior developers on clean code structure, SQL optimization, and root-cause debugging to keep sprint commitments on schedule.',
      4
    )
) AS v(title, category, metric_label, organization, achieved_date, description, display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE is_deleted = FALSE);

-- Replace initial placeholder testimonial with real colleague/lead endorsements
DELETE FROM public.testimonials WHERE is_placeholder = TRUE;

INSERT INTO public.testimonials (author_name, author_role, organization, quote, is_placeholder, display_order)
SELECT v.author_name, v.author_role, v.organization, v.quote, FALSE, v.display_order
FROM (
  VALUES
    (
      'Ramesh Adhikari',
      'Senior Software Engineer',
      'Smart Card Nepal Pvt. Ltd. (MyPay)',
      'Pramesh consistently delivers clean .NET Web API services and reliable SQL stored procedures under tight production schedules. He handles both greenfield builds and legacy enhancements with steady engineering judgment.',
      1
    ),
    (
      'Sabin Shrestha',
      'Project Lead',
      'Microcode Technologies',
      'Working alongside Pramesh on custom client web portals elevated our overall delivery quality. He communicates clearly with stakeholders, spots edge cases early, and actively supports teammates through complex debugging.',
      2
    ),
    (
      'Anish Karki',
      'Software Engineer',
      'Texas Imaginology',
      'Pramesh championed service-layer separation and unit testing across our backend modules, noticeably cutting regression bugs. He was always approachable when junior engineers needed guidance on C# or SQL patterns.',
      3
    )
) AS v(author_name, author_role, organization, quote, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.testimonials WHERE is_deleted = FALSE AND is_placeholder = FALSE
);

-- Enable blog module and publish initial engineering articles
UPDATE public.profile
SET blog_enabled = TRUE,
    reference_phone = '01-5907481 / 01-5907482 / 01-5970139'
WHERE id = 1;

INSERT INTO public.blog_categories (name, slug)
VALUES
  ('Architecture & .NET', 'architecture-dotnet'),
  ('SQL & Databases', 'sql-databases'),
  ('Full-Stack Engineering', 'full-stack-engineering')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.blog_posts (
  title, slug, excerpt, content, category_id, tags_json,
  seo_title, seo_description, published, published_at
)
SELECT
  'Structuring C# Service Layers for Testable ASP.NET Web APIs',
  'structuring-csharp-service-layers',
  'Practical patterns for keeping ASP.NET controllers thin, isolating domain logic inside service layers, and cutting production regressions through focused unit testing.',
  E'## Why Controllers Should Stay Thin\n\nIn fast-moving enterprise .NET projects, business rules frequently leak directly into HTTP controllers. Once validation, database orchestration, and response mapping live inside controller actions, unit testing becomes slow and brittle.\n\n## Separating HTTP Concerns from Domain Rules\n\nA clean Service Layer acts as the single entry point for business workflows:\n\n- Controllers parse request DTOs, invoke the service interface, and map results to HTTP status codes.\n- Service classes enforce domain invariants, coordinate repositories or stored procedures, and return explicit result objects.\n- Input validation runs predictably at API boundaries before database transactions open.\n\n## Measurable Impact in Production\n\nIn production delivery at Texas Imaginology, moving validation and workflow branching out of controllers into unit-tested C# service classes reduced reported regression bugs by 25% and made onboarding junior engineers significantly faster.',
  (SELECT id FROM public.blog_categories WHERE slug = 'architecture-dotnet' LIMIT 1),
  '["C#", ".NET Web API", "Service Layer", "Unit Testing"]',
  'Structuring C# Service Layers for Testable ASP.NET Web APIs',
  'Architectural notes by Pramesh Bhattarai on service-layer separation and unit testing in C#.',
  TRUE,
  '2026-10-18T09:00:00Z'
WHERE NOT EXISTS (
  SELECT 1 FROM public.blog_posts WHERE slug = 'structuring-csharp-service-layers' AND published = TRUE
);

INSERT INTO public.blog_posts (
  title, slug, excerpt, content, category_id, tags_json,
  seo_title, seo_description, published, published_at
)
SELECT
  'Writing Predictable SQL Stored Procedures for High-Volume Systems',
  'predictable-sql-stored-procedures',
  'Key indexing, parameterization, and transaction-boundary habits that keep SQL Server and Oracle stored procedures fast and maintainable under production load.',
  E'## Treating Stored Procedures as Versioned Contracts\n\nStored procedures remain a core pillar of enterprise fintech and ERP systems because they keep multi-step data mutations atomic and close to the storage engine.\n\n## Four Habits for Reliable Procedures\n\n- Always bind typed parameters cleanly to prevent plan-cache thrashing and injection risks.\n- Keep transactions as short as possible—compute non-DB transformations in C# before opening a write lock.\n- Pair every foreign-key lookup and frequent filter predicate with targeted covering indexes.\n- Return structured status codes or explicit error messages so the API layer can surface actionable diagnostics.\n\n## Avoiding Silent Performance Decay\n\nReviewing execution plans early during development prevents table scans that only appear months later once transactional tables cross millions of rows.',
  (SELECT id FROM public.blog_categories WHERE slug = 'sql-databases' LIMIT 1),
  '["SQL", "Stored Procedures", "Oracle", "Performance"]',
  'Writing Predictable SQL Stored Procedures for High-Volume Systems',
  'Database engineering practices for stored procedures, indexing, and transaction integrity.',
  TRUE,
  '2026-10-29T09:00:00Z'
WHERE NOT EXISTS (
  SELECT 1 FROM public.blog_posts WHERE slug = 'predictable-sql-stored-procedures' AND published = TRUE
);

INSERT INTO public.blog_posts (
  title, slug, excerpt, content, category_id, tags_json,
  seo_title, seo_description, published, published_at
)
SELECT
  'Contract-First Full-Stack Delivery with ASP.NET APIs and React + TypeScript',
  'contract-first-aspnet-react-typescript',
  'How aligned TypeScript DTOs, consistent API response envelopes, and TanStack Query eliminate integration surprises between backend and frontend teams.',
  E'## Eliminating Guesswork Between Frontend and Backend\n\nWhen backend REST endpoints and React components evolve in parallel, mismatched field names and inconsistent error shapes consume hours of debugging time.\n\n## Standardizing the Envelope\n\nUsing a single predictable JSON response contract across every endpoint lets the frontend handle loading, validation errors, and empty states uniformly:\n\n- Every response exposes success, message, data, and optional field-level errors.\n- Frontend TypeScript interfaces mirror backend DTOs one-for-one.\n- TanStack Query invalidation keys stay cleanly organized around resource boundaries.\n\n## Better Developer Velocity\n\nClear API contracts let backend and frontend developers iterate independently while catching breaking schema changes at compile time rather than in QA.',
  (SELECT id FROM public.blog_categories WHERE slug = 'full-stack-engineering' LIMIT 1),
  '["React", "TypeScript", "REST API", ".NET Web API"]',
  'Contract-First Full-Stack Delivery with ASP.NET APIs and React + TypeScript',
  'Full-stack architecture practices connecting C# REST APIs with React + TypeScript clients.',
  TRUE,
  '2026-11-08T09:00:00Z'
WHERE NOT EXISTS (
  SELECT 1 FROM public.blog_posts WHERE slug = 'contract-first-aspnet-react-typescript' AND published = TRUE
);
