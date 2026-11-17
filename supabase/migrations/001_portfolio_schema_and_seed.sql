-- =============================================================================
-- Pramesh Bhattarai Portfolio — Supabase PostgreSQL Schema, RLS & Verified Seed
-- Run this script once in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rbuuelqczoshuxlslxlj/sql/new
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  full_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  tagline TEXT NOT NULL,
  bio TEXT NOT NULL,
  career_objective TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_primary TEXT NOT NULL,
  phone_secondary TEXT NOT NULL,
  location TEXT NOT NULL,
  permanent_address TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  cv_url TEXT NOT NULL,
  linkedin_url TEXT NOT NULL,
  github_primary_url TEXT NOT NULL,
  github_secondary_url TEXT NOT NULL,
  availability TEXT NOT NULL,
  languages_json TEXT NOT NULL,
  reference_name TEXT NOT NULL,
  reference_role TEXT NOT NULL,
  reference_phone TEXT NOT NULL,
  years_experience_label TEXT NOT NULL,
  blog_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  seo_title TEXT NOT NULL,
  seo_description TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.skill_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.skills (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES public.skill_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.experiences (
  id SERIAL PRIMARY KEY,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  location TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  duration_label TEXT NOT NULL,
  summary TEXT NOT NULL,
  responsibilities_json TEXT NOT NULL DEFAULT '[]',
  achievements_json TEXT NOT NULL DEFAULT '[]',
  technologies_json TEXT NOT NULL DEFAULT '[]',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.education (
  id SERIAL PRIMARY KEY,
  institution TEXT NOT NULL,
  affiliated_university TEXT,
  degree TEXT NOT NULL,
  graduation_year TEXT NOT NULL,
  grade TEXT,
  highlights_json TEXT NOT NULL DEFAULT '[]',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.certifications (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  duration TEXT,
  credential_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  short_description TEXT NOT NULL,
  full_description TEXT NOT NULL,
  architecture_notes TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  github_url TEXT,
  live_demo_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_placeholder BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_technologies (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  technology_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.services (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL,
  deliverables_json TEXT NOT NULL DEFAULT '[]',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.testimonials (
  id SERIAL PRIMARY KEY,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  organization TEXT NOT NULL,
  quote TEXT NOT NULL,
  is_placeholder BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id SERIAL PRIMARY KEY,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES public.blog_categories(id),
  tags_json TEXT NOT NULL DEFAULT '[]',
  featured_image_url TEXT,
  seo_title TEXT,
  seo_description TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.media_files (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id SERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_category ON public.projects(category);
CREATE INDEX IF NOT EXISTS idx_project_tech_name ON public.project_technologies(technology_name);
CREATE INDEX IF NOT EXISTS idx_blog_slug ON public.blog_posts(slug);

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Public Read Policies
DROP POLICY IF EXISTS "Public read profile" ON public.profile;
CREATE POLICY "Public read profile" ON public.profile FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read skill_categories" ON public.skill_categories;
CREATE POLICY "Public read skill_categories" ON public.skill_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read skills" ON public.skills;
CREATE POLICY "Public read skills" ON public.skills FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read experiences" ON public.experiences;
CREATE POLICY "Public read experiences" ON public.experiences FOR SELECT USING (is_deleted = false);

DROP POLICY IF EXISTS "Public read education" ON public.education;
CREATE POLICY "Public read education" ON public.education FOR SELECT USING (is_deleted = false);

DROP POLICY IF EXISTS "Public read certifications" ON public.certifications;
CREATE POLICY "Public read certifications" ON public.certifications FOR SELECT USING (is_deleted = false);

DROP POLICY IF EXISTS "Public read projects" ON public.projects;
CREATE POLICY "Public read projects" ON public.projects FOR SELECT USING (is_deleted = false);

DROP POLICY IF EXISTS "Public read project_technologies" ON public.project_technologies;
CREATE POLICY "Public read project_technologies" ON public.project_technologies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read services" ON public.services;
CREATE POLICY "Public read services" ON public.services FOR SELECT USING (is_deleted = false);

DROP POLICY IF EXISTS "Public read testimonials" ON public.testimonials;
CREATE POLICY "Public read testimonials" ON public.testimonials FOR SELECT USING (is_deleted = false);

DROP POLICY IF EXISTS "Public read blog_categories" ON public.blog_categories;
CREATE POLICY "Public read blog_categories" ON public.blog_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read published blog_posts" ON public.blog_posts;
CREATE POLICY "Public read published blog_posts" ON public.blog_posts FOR SELECT USING (is_deleted = false AND published = true);

-- Public Contact Submission (Insert Only — No public read of private messages)
DROP POLICY IF EXISTS "Public insert contact_messages" ON public.contact_messages;
CREATE POLICY "Public insert contact_messages" ON public.contact_messages FOR INSERT WITH CHECK (true);

-- =============================================================================
-- Verified Seed Data (Pramesh Bhattarai Resume)
-- =============================================================================

INSERT INTO public.profile (
  id, full_name, headline, tagline, bio, career_objective,
  email, phone_primary, phone_secondary, location, permanent_address,
  avatar_url, cv_url, linkedin_url, github_primary_url, github_secondary_url,
  availability, languages_json, reference_name, reference_role, reference_phone,
  years_experience_label, blog_enabled, seo_title, seo_description
) VALUES (
  1,
  'Pramesh Bhattarai',
  'Full-Stack Software Engineer',
  'Designing resilient C# APIs, relational SQL architectures, and clean web applications.',
  'I am a Kathmandu-based .NET Developer with 5+ years of hands-on experience building custom web applications, designing service-layer REST APIs, writing stored procedures, and supporting production enterprise systems. Across roles at Texas Imaginology, Microcode Technologies, and Mypay, I have combined C# / ASP.NET engineering with React, Django, and Oracle/SQL databases while mentoring junior developers.',
  'Experienced .NET Developer aiming to contribute to system architecture, API development, and optimization processes while mentoring junior developers and helping deliver robust enterprise solutions.',
  'prameshbhattaraiofficial@gmail.com',
  '+977 9863439135',
  '+977 9709166318',
  'Kapan, Kathmandu, Nepal',
  'Sindhupalchowk, Tinghare, Nepal',
  '/assets/pramesh-avatar.jpg',
  '/assets/aistudio/Pramesh_Bhattarai__1__3a748bfe.pdf',
  'https://www.linkedin.com/in/prameshbhattaraiofficial',
  'https://github.com/prameshbhattaraiofficial',
  'https://github.com/codingwithpramesh',
  'Full-Time · Freelance · Part-Time (Mid-Level)',
  '[{"language":"English","reading":"Good","speaking":"Good","writing":"Good","listening":"Good"},{"language":"Nepali","reading":"Good","speaking":"Good","writing":"Good","listening":"Good"}]',
  'Smart Card Nepal Pvt. Ltd. (Big Solution Pvt. Ltd.)',
  'Dotnet Developer Reference — MyPay',
  '01-5907481 / 01-5907482 / 01-5970139',
  '5+ Years',
  FALSE,
  'Pramesh Bhattarai — Full-Stack Software Engineer',
  'Personal portfolio of Pramesh Bhattarai, a Full-Stack Software Engineer in Kathmandu, Nepal specializing in ASP.NET Web API, C#, SQL, and React.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.skill_categories (name, slug, display_order) VALUES
  ('Backend & APIs', 'backend-apis', 1),
  ('Frontend & Data Interchange', 'frontend-data', 2),
  ('Databases & Querying', 'databases', 3),
  ('Tools & Engineering Practices', 'tools-engineering', 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.skills (category_id, name, description, display_order)
SELECT sc.id, v.name, v.description, v.display_order
FROM (VALUES
  ('backend-apis', 'C#', 'Primary object-oriented language for enterprise services and business logic', 1),
  ('backend-apis', '.NET Web API', 'RESTful web service implementation and validation controls', 2),
  ('backend-apis', 'ASP.NET MVC', 'Server-rendered MVC web applications and enterprise portals', 3),
  ('backend-apis', 'REST API', 'Service-layer HTTP API design and client integration', 4),
  ('backend-apis', 'MVC', 'Clean separation of models, views, and controllers', 5),
  ('backend-apis', 'Python', 'Backend scripting and rapid web service prototyping', 6),
  ('backend-apis', 'Django Framework', 'Full-featured Python web framework experience', 7),
  ('frontend-data', 'React', 'Component-driven interactive web interfaces', 1),
  ('frontend-data', 'Ajax', 'Asynchronous client-server updates and form workflows', 2),
  ('frontend-data', 'JSON', 'Structured API payload modeling and serialization', 3),
  ('databases', 'SQL', 'Complex relational queries, joins, and stored procedures', 1),
  ('databases', 'Oracle', 'Enterprise relational database operations and querying', 2),
  ('databases', 'DBMS', 'Normalized schema design, integrity constraints, and indexing', 3),
  ('tools-engineering', 'Git', 'Branching workflows, code collaboration, and version control', 1),
  ('tools-engineering', 'Jira', 'Sprint tracking, issue triage, and project delivery', 2),
  ('tools-engineering', 'Problem-Solving Skills', 'Root-cause debugging across production web applications', 3),
  ('tools-engineering', 'Supervision', 'Assisting and mentoring junior developers in coding and debugging', 4)
) AS v(cat_slug, name, description, display_order)
JOIN public.skill_categories sc ON sc.slug = v.cat_slug
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.experiences (
  company, position, location, start_date, end_date, duration_label,
  summary, responsibilities_json, achievements_json, technologies_json, display_order
)
SELECT * FROM (VALUES
  (
    'Mypay (Smart Card Nepal Pvt. Ltd.)',
    'Dotnet Developer',
    'Bhaktapur, Nepal',
    'February 2024',
    'Present',
    '2 years, 9 months',
    'Building new web services and custom applications from scratch while maintaining and enhancing multiple production systems.',
    '["Developed and implemented web services using .NET Web API.","Used .NET validation controls for reliable client-side and request validation.","Wrote SQL statements and Stored Procedures to power data-intensive workflows.","Developed multiple new applications from scratch and supported multiple existing production applications.","Collaborated closely with team members to meet project deadlines consistently."]',
    '["Delivered custom web applications resulting in increased client satisfaction rates.","Maintained timely delivery across concurrent new builds and legacy application support."]',
    '["C#",".NET Web API","ASP.NET MVC","SQL","Stored Procedures","Git"]',
    1
  ),
  (
    'Microcode Technologies',
    'Dotnet Developer',
    'Shankhamul, Kathmandu',
    'June 2023',
    'February 2024',
    '8 months',
    'Built custom web applications and upgraded existing platforms with improved functionality, UX, and SQL backend support.',
    '["Developed custom web applications tailored to client workflows.","Maintained and updated existing web applications to improve functionality and user experience.","Assisted other developers in coding and debugging technical issues.","Wrote SQL statements and Stored Procedures for core application modules.","Collaborated with team members to meet project delivery deadlines."]',
    '["Increased client satisfaction rates through custom feature delivery and UX refinements."]',
    '["C#","ASP.NET MVC","SQL","Stored Procedures","Ajax","JSON"]',
    2
  ),
  (
    'Texas Imaginology',
    'Dotnet Developer',
    'Sifal, Kathmandu',
    'March 2021',
    'April 2023',
    '2 years, 1 month',
    'Designed C# REST web services with a Service Layer architecture, partnered directly with clients, and drove unit testing quality.',
    '["Designed REST web services in C# using a clean Service Layer pattern.","Worked directly with clients to gather requirements and iterate on deliverables.","Conducted unit testing across service and business logic layers.","Assisted other developers in coding and debugging issues.","Wrote SQL statements and Stored Procedures and collaborated with the team to meet deadlines."]',
    '["Conducted unit testing resulting in a 25% decrease in bugs."]',
    '["C#","REST API","Service Layer","Unit Testing","SQL","Stored Procedures"]',
    3
  )
) AS v(company, position, location, start_date, end_date, duration_label, summary, responsibilities_json, achievements_json, technologies_json, display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.experiences);

INSERT INTO public.education (institution, affiliated_university, degree, graduation_year, grade, highlights_json, display_order)
SELECT
  'Texas International College, Kathmandu',
  'Lincoln University, Malaysia',
  'Bachelor of Information Technology (BIT)',
  'April 2023',
  'CGPA 3.74',
  '["Focused on software engineering, database management systems, and web application development.","Graduated with strong academic standing (CGPA 3.74) while working full-time in .NET development."]',
  1
WHERE NOT EXISTS (SELECT 1 FROM public.education);

INSERT INTO public.certifications (title, issuer, issue_date, duration, credential_url, display_order)
SELECT 'Flutter Mobile Development Training', 'IT Institution', 'June 2023', '6 Months', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM public.certifications);

INSERT INTO public.services (title, slug, short_description, deliverables_json, display_order) VALUES
  ('Backend API & Service Layer Architecture', 'backend-api-architecture', 'Design and implementation of maintainable RESTful services using C#, .NET Web API, and layered architecture.', '["Service-layer C# API design with input validation","Structured JSON contracts and predictable error responses","Unit testing to reduce regression defects"]', 1),
  ('Full-Stack Web Application Development', 'full-stack-web-development', 'End-to-end delivery of custom web applications combining ASP.NET MVC or Django backends with responsive React interfaces.', '["Custom business web applications built from scratch","Interactive Ajax and React client workflows","Cross-browser validation and responsive layouts"]', 2),
  ('Database Design & SQL Optimization', 'database-design-sql', 'Relational database modeling, stored procedure authoring, and query optimization across SQL Server, PostgreSQL, and Oracle.', '["Normalized DBMS schemas and referential integrity","Optimized SQL queries and Stored Procedures","Data consistency and validation rules"]', 3),
  ('Application Maintenance & Developer Mentoring', 'maintenance-and-mentoring', 'Ongoing enhancement of existing production web systems alongside debugging support and peer code supervision.', '["Feature upgrades and UX improvements on legacy apps","Root-cause debugging and defect resolution","Hands-on guidance for junior developers"]', 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.projects (
  title, slug, category, short_description, full_description, architecture_notes,
  image_url, github_url, live_demo_url, featured, is_placeholder, display_order
) VALUES
  ('Enterprise REST Service Layer (Placeholder — Edit in Admin)', 'enterprise-rest-service-layer', 'Backend API', 'Editable placeholder case study representing C# .NET Web API and Service Layer architectures built across production engagements.', 'Replace this editable placeholder in the Admin Dashboard with specific public project details, repository links, and non-confidential architectural highlights from your .NET Web API and Service Layer work.', 'Clean separation between HTTP controllers, validation controls, C# Service Layer business rules, and SQL Stored Procedures.', NULL, 'https://github.com/prameshbhattaraiofficial', NULL, TRUE, TRUE, 1),
  ('Custom Client Web Portal (Placeholder — Edit in Admin)', 'custom-client-web-portal', 'Full-Stack', 'Editable placeholder case study representing custom ASP.NET MVC and React web applications delivered from scratch for enterprise clients.', 'Update this project slot via the Admin Dashboard (/admin) with your public screenshots, live URL, and implementation summary.', 'ASP.NET MVC & React frontend integration backed by normalized SQL tables, Ajax asynchronous workflows, and server/client validation.', NULL, 'https://github.com/codingwithpramesh', NULL, TRUE, TRUE, 2),
  ('Python & Django Service Prototype (Placeholder — Edit in Admin)', 'python-django-service-prototype', 'Web Platform', 'Editable placeholder case study showcasing Python, Django Framework, and relational DBMS workflows ready for your GitHub repository link.', 'Replace this editable template in the Admin Dashboard with your open-source Python/Django or Flutter training project.', 'Modular Django views and ORM models paired with REST JSON endpoints and Git-based team workflows.', NULL, 'https://github.com/prameshbhattaraiofficial', NULL, FALSE, TRUE, 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.project_technologies (project_id, technology_name)
SELECT p.id, t.tech
FROM public.projects p
JOIN (VALUES
  ('enterprise-rest-service-layer', 'C#'),
  ('enterprise-rest-service-layer', '.NET Web API'),
  ('enterprise-rest-service-layer', 'REST API'),
  ('enterprise-rest-service-layer', 'SQL'),
  ('enterprise-rest-service-layer', 'Unit Testing'),
  ('custom-client-web-portal', 'ASP.NET MVC'),
  ('custom-client-web-portal', 'React'),
  ('custom-client-web-portal', 'Ajax'),
  ('custom-client-web-portal', 'JSON'),
  ('custom-client-web-portal', 'Oracle'),
  ('python-django-service-prototype', 'Python'),
  ('python-django-service-prototype', 'Django Framework'),
  ('python-django-service-prototype', 'DBMS'),
  ('python-django-service-prototype', 'SQL'),
  ('python-django-service-prototype', 'Git')
) AS t(slug, tech) ON p.slug = t.slug
WHERE NOT EXISTS (SELECT 1 FROM public.project_technologies pt WHERE pt.project_id = p.id);

INSERT INTO public.testimonials (author_name, author_role, organization, quote, is_placeholder, display_order)
SELECT 'Engineering Reference Available on Request', 'Dotnet Developer Reference', 'Smart Card Nepal Pvt. Ltd. (MyPay)', 'Editable placeholder endorsement — replace via Admin Dashboard with a direct quote from a colleague, manager, or client when ready to publish.', TRUE, 1
WHERE NOT EXISTS (SELECT 1 FROM public.testimonials);
