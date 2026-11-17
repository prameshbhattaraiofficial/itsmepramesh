import { Router, type Request } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { z } from 'zod';
import { db } from '../db.ts';
import { isSupabaseSchemaReady, supabasePublic } from '../supabase.ts';
import { requireAuth, recordAuditLog, tryGetAuthUser, type AuthenticatedRequest } from '../auth.ts';
import { sendTransactionalEmail } from '../email.ts';
import {
  buildEsewaInitiation,
  checkEsewaTransactionStatus,
  getEsewaConfig,
  verifyEsewaCallbackPayload,
} from '../esewa.ts';
import {
  PRIVATE_VOICE_DIR,
  createRateLimiter,
  recordSecurityEvent,
  resolvePrivatePdfPath,
  resolveVoicePath,
  verifyFileMagicBytes,
} from '../security.ts';
import { broadcastToAdmins, broadcastToConversation } from '../realtime.ts';

const uploadVisitorVoice = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PRIVATE_VOICE_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.webm';
      const rand = crypto.randomBytes(6).toString('hex');
      cb(null, `voice-${Date.now()}-${rand}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
});

function getVoiceMimeByExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.ogg' || ext === '.opus') return 'audio/ogg';
  if (ext === '.m4a' || ext === '.mp4') return 'audio/mp4';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.mp3') return 'audio/mpeg';
  return 'audio/webm';
}

function resolvePublicOrigin(req: Request): string {
  const configured = process.env.APP_URL;
  if (configured && configured !== 'MY_APP_URL') {
    return configured.replace(/\/+$/, '');
  }
  const proto = String(req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  const host = String(req.get('x-forwarded-host') || req.get('host') || 'localhost:3000').split(',')[0].trim();
  return `${proto}://${host}`;
}

export const publicRouter = Router();

const contactRateMap = new Map<string, { count: number; resetAt: number }>();

const orderRateLimiter = createRateLimiter({
  keyPrefix: 'orders',
  windowMs: 5 * 60 * 1000,
  max: 25,
  message: 'Too many order submissions. Please wait a few minutes and try again.',
});

const paymentRateLimiter = createRateLimiter({
  keyPrefix: 'payment-verify',
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: 'Too many payment verification attempts. Please wait a moment.',
});

const downloadRateLimiter = createRateLimiter({
  keyPrefix: 'pdf-download',
  windowMs: 5 * 60 * 1000,
  max: 40,
  message: 'Download rate limit reached. Please wait a few minutes before downloading again.',
});

function sanitizePlainText(input: string): string {
  return input.replace(/[<>]/g, '').trim();
}

function mapProjectRow(row: Record<string, unknown>) {
  const techs = db
    .prepare('SELECT technology_name FROM project_technologies WHERE project_id = ?')
    .all(row.id) as { technology_name: string }[];

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    architectureNotes: row.architecture_notes,
    imageUrl: row.image_url,
    githubUrl: row.github_url,
    liveDemoUrl: row.live_demo_url,
    technologies: techs.map((t) => t.technology_name),
    featured: Boolean(row.featured),
    isPlaceholder: Boolean(row.is_placeholder),
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSupabaseProfile(row: Record<string, unknown>) {
  const headline =
    row.headline === '.NET Developer & Full-Stack Software Engineer'
      ? 'Full-Stack Software Engineer'
      : row.headline;
  const seoTitle =
    row.seo_title === 'Pramesh Bhattarai — .NET & Full-Stack Software Developer'
      ? 'Pramesh Bhattarai — Full-Stack Software Engineer'
      : row.seo_title;
  const referencePhone =
    row.reference_phone === '9709166318'
      ? '01-5907481 / 01-5907482 / 01-5970139'
      : row.reference_phone;

  return {
    id: row.id,
    fullName: row.full_name,
    headline,
    tagline: row.tagline,
    bio: row.bio,
    careerObjective: row.career_objective,
    email: row.email,
    phonePrimary: row.phone_primary,
    phoneSecondary: row.phone_secondary,
    location: row.location,
    permanentAddress: row.permanent_address,
    avatarUrl: row.avatar_url,
    cvUrl: row.cv_url,
    linkedinUrl: row.linkedin_url,
    githubPrimaryUrl: row.github_primary_url,
    githubSecondaryUrl: row.github_secondary_url,
    availability: row.availability,
    languagesJson: row.languages_json,
    referenceName: row.reference_name,
    referenceRole: row.reference_role,
    referencePhone,
    yearsExperienceLabel: row.years_experience_label,
    blogEnabled: Boolean(row.blog_enabled),
    seoTitle,
    seoDescription: row.seo_description,
    updatedAt: row.updated_at,
  };
}

publicRouter.get('/health', async (_req, res) => {
  const supabaseReady = await isSupabaseSchemaReady();
  res.json({
    success: true,
    data: {
      status: 'healthy',
      database: 'sqlite',
      supabaseConfigured: Boolean(supabasePublic),
      supabaseBackupReady: supabaseReady,
      timestamp: new Date().toISOString(),
    },
  });
});

publicRouter.get('/profile', (_req, res) => {
  const localRow = db.prepare('SELECT * FROM profile WHERE id = 1').get() as Record<string, unknown> | undefined;

  if (!localRow) {
    res.status(404).json({ success: false, message: 'Profile not found.', data: null });
    return;
  }
  res.json({ success: true, data: mapSupabaseProfile(localRow) });
});

publicRouter.get('/skills', (_req, res) => {
  const categories = db
    .prepare('SELECT id, name, slug, display_order FROM skill_categories ORDER BY display_order ASC, id ASC')
    .all() as { id: number; name: string; slug: string; display_order: number }[];

  const skills = db
    .prepare('SELECT id, category_id, name, description, display_order FROM skills ORDER BY display_order ASC, id ASC')
    .all() as { id: number; category_id: number; name: string; description: string | null; display_order: number }[];

  const data = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    displayOrder: cat.display_order,
    skills: skills
      .filter((s) => s.category_id === cat.id)
      .map((s) => ({
        id: s.id,
        categoryId: s.category_id,
        categoryName: cat.name,
        name: s.name,
        description: s.description,
        displayOrder: s.display_order,
      })),
  }));

  res.json({ success: true, data });
});

publicRouter.get('/experiences', (_req, res) => {

  const rows = db
    .prepare('SELECT * FROM experiences WHERE is_deleted = 0 ORDER BY display_order ASC, id ASC')
    .all() as Record<string, unknown>[];

  const data = rows.map((r) => ({
    id: r.id,
    company: r.company,
    position: r.position,
    location: r.location,
    startDate: r.start_date,
    endDate: r.end_date,
    durationLabel: r.duration_label,
    summary: r.summary,
    responsibilities: JSON.parse(String(r.responsibilities_json || '[]')),
    achievements: JSON.parse(String(r.achievements_json || '[]')),
    technologies: JSON.parse(String(r.technologies_json || '[]')),
    displayOrder: r.display_order,
  }));

  res.json({ success: true, data });
});

publicRouter.get('/education', (_req, res) => {

  const eduRows = db
    .prepare('SELECT * FROM education WHERE is_deleted = 0 ORDER BY display_order ASC, id ASC')
    .all() as Record<string, unknown>[];

  const certRows = db
    .prepare('SELECT * FROM certifications WHERE is_deleted = 0 ORDER BY display_order ASC, id ASC')
    .all() as Record<string, unknown>[];

  res.json({
    success: true,
    data: {
      education: eduRows.map((r) => ({
        id: r.id,
        institution: r.institution,
        affiliatedUniversity: r.affiliated_university,
        degree: r.degree,
        graduationYear: r.graduation_year,
        grade: r.grade,
        highlights: JSON.parse(String(r.highlights_json || '[]')),
        displayOrder: r.display_order,
      })),
      certifications: certRows.map((c) => ({
        id: c.id,
        title: c.title,
        issuer: c.issuer,
        issueDate: c.issue_date,
        duration: c.duration,
        credentialUrl: c.credential_url,
        displayOrder: c.display_order,
      })),
    },
  });
});

publicRouter.get('/achievements', (_req, res) => {

  const achRows = db
    .prepare('SELECT * FROM achievements WHERE is_deleted = 0 ORDER BY display_order ASC, id ASC')
    .all() as Record<string, unknown>[];

  const certRows = db
    .prepare('SELECT * FROM certifications WHERE is_deleted = 0 ORDER BY display_order ASC, id ASC')
    .all() as Record<string, unknown>[];

  res.json({
    success: true,
    data: {
      achievements: achRows.map((a) => ({
        id: a.id,
        title: a.title,
        category: a.category,
        metricLabel: a.metric_label,
        organization: a.organization,
        achievedDate: a.achieved_date,
        description: a.description,
        displayOrder: a.display_order,
      })),
      certifications: certRows.map((c) => ({
        id: c.id,
        title: c.title,
        issuer: c.issuer,
        issueDate: c.issue_date,
        duration: c.duration,
        credentialUrl: c.credential_url,
        displayOrder: c.display_order,
      })),
    },
  });
});

publicRouter.get('/projects', (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const tech = typeof req.query.tech === 'string' ? req.query.tech.trim() : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const sort = req.query.sort === 'newest' ? 'created_at DESC' : 'display_order ASC, id ASC';
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 12)));

  const rows = db
    .prepare(`SELECT * FROM projects WHERE is_deleted = 0 ORDER BY ${sort}`)
    .all() as Record<string, unknown>[];
  let mapped = rows.map(mapProjectRow);

  if (category && category !== 'All') {
    mapped = mapped.filter((p) => String(p.category).toLowerCase() === category.toLowerCase());
  }
  if (tech && tech !== 'All') {
    mapped = mapped.filter((p) =>
      p.technologies.some((t) => t.toLowerCase() === tech.toLowerCase())
    );
  }
  if (search) {
    mapped = mapped.filter(
      (p) =>
        String(p.title).toLowerCase().includes(search) ||
        String(p.shortDescription).toLowerCase().includes(search) ||
        p.technologies.some((t) => t.toLowerCase().includes(search))
    );
  }

  const total = mapped.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;
  const items = mapped.slice(offset, offset + pageSize);

  res.json({
    success: true,
    data: { items, total, page, pageSize, totalPages },
  });
});

publicRouter.get('/projects/:idOrSlug', (req, res) => {
  const param = req.params.idOrSlug;
  const isNumeric = /^\d+$/.test(param);

  const row = db
    .prepare(
      isNumeric
        ? 'SELECT * FROM projects WHERE id = ? AND is_deleted = 0'
        : 'SELECT * FROM projects WHERE slug = ? AND is_deleted = 0'
    )
    .get(isNumeric ? Number(param) : param) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ success: false, message: 'Project not found.', data: null });
    return;
  }

  res.json({ success: true, data: mapProjectRow(row) });
});

publicRouter.get('/services', (_req, res) => {

  const rows = db
    .prepare('SELECT * FROM services WHERE is_deleted = 0 ORDER BY display_order ASC, id ASC')
    .all() as Record<string, unknown>[];

  res.json({
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      shortDescription: r.short_description,
      deliverables: JSON.parse(String(r.deliverables_json || '[]')),
      displayOrder: r.display_order,
    })),
  });
});

publicRouter.get('/testimonials', (_req, res) => {

  const rows = db
    .prepare('SELECT * FROM testimonials WHERE is_deleted = 0 ORDER BY display_order ASC, id ASC')
    .all() as Record<string, unknown>[];

  res.json({
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      authorName: r.author_name,
      authorRole: r.author_role,
      organization: r.organization,
      quote: r.quote,
      isPlaceholder: Boolean(r.is_placeholder),
      displayOrder: r.display_order,
    })),
  });
});

publicRouter.get('/blog', (req, res) => {
  const profile = db.prepare('SELECT blog_enabled FROM profile WHERE id = 1').get() as { blog_enabled: number } | undefined;
  if (!profile?.blog_enabled) {
    res.json({
      success: true,
      message: 'Blog module is currently disabled.',
      data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 1, enabled: false },
    });
    return;
  }

  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

  const rows = db
    .prepare(`
      SELECT bp.*, bc.name AS category_name
      FROM blog_posts bp
      JOIN blog_categories bc ON bc.id = bp.category_id
      WHERE bp.is_deleted = 0 AND bp.published = 1
      ORDER BY COALESCE(bp.published_at, bp.created_at) DESC
    `)
    .all() as Record<string, unknown>[];

  let posts = rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    content: r.content,
    categoryName: r.category_name,
    tags: JSON.parse(String(r.tags_json || '[]')) as string[],
    featuredImageUrl: r.featured_image_url,
    seoTitle: r.seo_title,
    seoDescription: r.seo_description,
    published: Boolean(r.published),
    publishedAt: r.published_at,
    createdAt: r.created_at,
  }));

  if (category && category !== 'All') {
    posts = posts.filter((p) => String(p.categoryName).toLowerCase() === category.toLowerCase());
  }
  if (search) {
    posts = posts.filter(
      (p) =>
        String(p.title).toLowerCase().includes(search) ||
        String(p.excerpt).toLowerCase().includes(search) ||
        p.tags.some((t) => t.toLowerCase().includes(search))
    );
  }

  res.json({
    success: true,
    data: { items: posts, total: posts.length, page: 1, pageSize: posts.length || 10, totalPages: 1, enabled: true },
  });
});

publicRouter.get('/blog/:slug', (req, res) => {
  const profile = db.prepare('SELECT blog_enabled FROM profile WHERE id = 1').get() as { blog_enabled: number } | undefined;
  if (!profile?.blog_enabled) {
    res.status(404).json({ success: false, message: 'Blog module is currently disabled.', data: null });
    return;
  }

  const row = db
    .prepare(`
      SELECT bp.*, bc.name AS category_name
      FROM blog_posts bp
      JOIN blog_categories bc ON bc.id = bp.category_id
      WHERE bp.slug = ? AND bp.is_deleted = 0 AND bp.published = 1
    `)
    .get(req.params.slug) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ success: false, message: 'Article not found.', data: null });
    return;
  }

  res.json({
    success: true,
    data: {
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      content: row.content,
      categoryName: row.category_name,
      tags: JSON.parse(String(row.tags_json || '[]')),
      featuredImageUrl: row.featured_image_url,
      seoTitle: row.seo_title,
      seoDescription: row.seo_description,
      published: Boolean(row.published),
      publishedAt: row.published_at,
      createdAt: row.created_at,
    },
  });
});

const contactSchema = z.object({
  senderName: z.string().trim().min(2, 'Name must be at least 2 characters.').max(120),
  senderEmail: z.string().trim().email('Please provide a valid email address.').max(180),
  subject: z.string().trim().min(2, 'Subject must be at least 2 characters.').max(200),
  message: z.string().trim().min(5, 'Message must be at least 5 characters.').max(4000),
});

async function forwardContactEmail(payload: {
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  recipientEmail: string;
}): Promise<boolean> {
  const result = await sendTransactionalEmail({
    to: payload.recipientEmail,
    replyTo: payload.senderEmail,
    subject: `[Portfolio Inquiry] ${payload.subject}`,
    text: `From: ${payload.senderName} <${payload.senderEmail}>\n\n${payload.message}`,
    eventType: 'CONTACT_INQUIRY',
  });
  if (result.sent) return true;

  const web3FormsKey = process.env.WEB3FORMS_ACCESS_KEY?.trim();
  if (web3FormsKey) {
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: web3FormsKey,
          name: payload.senderName,
          email: payload.senderEmail,
          subject: `[Portfolio Inquiry] ${payload.subject}`,
          message: payload.message,
        }),
      });
      if (res.ok) return true;
      console.error('Web3Forms forward failed:', res.status, await res.text());
    } catch (err) {
      console.error('Web3Forms forward error:', err);
    }
  }

  return false;
}

publicRouter.post('/contact', async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] || 'form');
      errors[key] = errors[key] || [];
      errors[key].push(issue.message);
    }
    res.status(400).json({
      success: false,
      message: 'Please correct the highlighted fields.',
      data: null,
      errors,
    });
    return;
  }

  const forwardedHeader = req.get('x-forwarded-for');
  const clientIp =
    (forwardedHeader ? forwardedHeader.split(',')[0].trim() : '') ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown';
  const now = Date.now();
  const rate = contactRateMap.get(clientIp);
  if (rate && rate.resetAt > now) {
    if (rate.count >= 10) {
      res.status(429).json({
        success: false,
        message: 'Too many messages sent recently. Please try again in a few minutes.',
        data: null,
      });
      return;
    }
    rate.count += 1;
  } else {
    contactRateMap.set(clientIp, { count: 1, resetAt: now + 15 * 60 * 1000 });
  }

  const cleanPayload = {
    sender_name: sanitizePlainText(parsed.data.senderName),
    sender_email: parsed.data.senderEmail.trim(),
    subject: sanitizePlainText(parsed.data.subject),
    message: sanitizePlainText(parsed.data.message),
    ip_address: clientIp,
  };

  if (supabasePublic) {
    try {
      const { error: sbErr } = await supabasePublic.from('contact_messages').insert(cleanPayload);
      if (sbErr) {
        console.error('Supabase contact_messages insert warning:', sbErr.message);
      }
    } catch (err) {
      console.error('Supabase contact_messages insert exception:', err);
    }
  }

  const info = db
    .prepare(
      'INSERT INTO contact_messages (sender_name, sender_email, subject, message, ip_address) VALUES (?, ?, ?, ?, ?)'
    )
    .run(
      cleanPayload.sender_name,
      cleanPayload.sender_email,
      cleanPayload.subject,
      cleanPayload.message,
      cleanPayload.ip_address
    );

  const profileRow = db.prepare('SELECT email FROM profile WHERE id = 1').get() as { email?: string } | undefined;
  const recipientEmail = profileRow?.email || 'prameshbhattaraiofficial@gmail.com';
  const emailForwarded = await forwardContactEmail({
    senderName: cleanPayload.sender_name,
    senderEmail: cleanPayload.sender_email,
    subject: cleanPayload.subject,
    message: cleanPayload.message,
    recipientEmail,
  });

  broadcastToAdmins({
    type: 'admin:notification',
    id: `contact-${info.lastInsertRowid}`,
    category: 'contact',
    title: 'New Contact Inquiry',
    message: `${cleanPayload.sender_name}: ${cleanPayload.subject}`,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({
    success: true,
    message: emailForwarded
      ? 'Thank you for reaching out. Your message has been sent and logged.'
      : 'Thank you for reaching out. Your message has been received in the portfolio inbox.',
    data: { id: Number(info.lastInsertRowid), emailForwarded },
  });
});

// --- Products & Orders Storefront API ---

function mapProductRow(row: Record<string, unknown>) {
  let features: string[] = [];
  try {
    features = JSON.parse(String(row.features_json || '[]'));
  } catch {
    features = [];
  }
  const ratingStats = db
    .prepare('SELECT ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS cnt FROM product_reviews WHERE product_id = ?')
    .get(Number(row.id)) as { avg_rating: number | null; cnt: number } | undefined;

  return {
    id: Number(row.id),
    title: String(row.title),
    slug: String(row.slug),
    category: String(row.category),
    shortDescription: String(row.short_description),
    fullDescription: String(row.full_description),
    priceUsd: Number(row.price_usd || 0),
    priceNpr: Number(row.price_npr || 0),
    compareAtUsd: row.compare_at_usd != null ? Number(row.compare_at_usd) : null,
    sku: String(row.sku || ''),
    inventoryCount: Number(row.inventory_count ?? 0),
    isDigital: Boolean(row.is_digital),
    imageUrl: row.image_url ? String(row.image_url) : null,
    hasPdf: Boolean(row.pdf_url),
    deliveryInfo: String(row.delivery_info || ''),
    features,
    featured: Boolean(row.featured),
    isActive: Boolean(row.is_active),
    averageRating: ratingStats?.avg_rating != null ? Number(ratingStats.avg_rating) : 0,
    reviewCount: Number(ratingStats?.cnt || 0),
    displayOrder: Number(row.display_order || 0),
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

publicRouter.get('/products', (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

  const rows = db
    .prepare('SELECT * FROM products WHERE is_deleted = 0 AND is_active = 1 ORDER BY display_order ASC, id ASC')
    .all() as Record<string, unknown>[];
  let items = rows.map(mapProductRow);

  if (category && category !== 'All') {
    items = items.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }
  if (search) {
    items = items.filter(
      (p) =>
        p.title.toLowerCase().includes(search) ||
        p.shortDescription.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search)
    );
  }

  res.json({ success: true, data: items });
});

publicRouter.get('/products/:idOrSlug', (req, res) => {
  const param = req.params.idOrSlug;
  const isNumeric = /^\d+$/.test(param);

  const row = db
    .prepare(
      isNumeric
        ? 'SELECT * FROM products WHERE id = ? AND is_deleted = 0 AND is_active = 1'
        : 'SELECT * FROM products WHERE slug = ? AND is_deleted = 0 AND is_active = 1'
    )
    .get(isNumeric ? Number(param) : param) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ success: false, message: 'Product not found.', data: null });
    return;
  }

  res.json({ success: true, data: mapProductRow(row) });
});

const orderSchema = z.object({
  customerName: z.string().trim().min(2, 'Full name is required.').max(120),
  customerEmail: z.string().trim().email('Valid email address is required.').max(180),
  customerPhone: z.string().trim().min(7, 'Phone number is required.').max(40),
  shippingAddress: z.string().trim().max(400).optional().default(''),
  paymentMethod: z.enum(['esewa', 'khalti', 'stripe', 'bank_transfer', 'cod']),
  currency: z.enum(['USD', 'NPR']).default('USD'),
  notes: z.string().trim().max(1000).optional().default(''),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(25),
      })
    )
    .min(1, 'Select at least one product before submitting an order.'),
});

publicRouter.post('/orders', orderRateLimiter, async (req, res) => {
  const idempotencyKeyRaw = req.get('idempotency-key');
  const idempotencyKey = idempotencyKeyRaw ? idempotencyKeyRaw.trim().slice(0, 128) : null;
  if (idempotencyKey) {
    const existingOrder = db
      .prepare('SELECT * FROM orders WHERE idempotency_key = ?')
      .get(idempotencyKey) as Record<string, unknown> | undefined;
    if (existingOrder) {
      const origin = resolvePublicOrigin(req);
      let esewa: ReturnType<typeof buildEsewaInitiation> | undefined;
      if (existingOrder.payment_method === 'esewa' && existingOrder.transaction_uuid && existingOrder.status === 'pending') {
        esewa = buildEsewaInitiation({
          totalAmountNpr: Number(existingOrder.total_amount),
          transactionUuid: String(existingOrder.transaction_uuid),
          successUrl: `${origin}/payment/esewa/success`,
          failureUrl: `${origin}/payment/esewa/failure?order=${encodeURIComponent(String(existingOrder.order_number))}`,
        });
      }
      res.status(200).json({
        success: true,
        message: `Order ${String(existingOrder.order_number)} retrieved (idempotent).`,
        data: {
          id: Number(existingOrder.id),
          orderNumber: String(existingOrder.order_number),
          status: String(existingOrder.status),
          paymentMethod: String(existingOrder.payment_method),
          currency: String(existingOrder.currency),
          totalAmount: Number(existingOrder.total_amount),
          items: JSON.parse(String(existingOrder.items_json || '[]')),
          createdAt: String(existingOrder.created_at),
          esewa,
        },
      });
      return;
    }
  }

  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] || 'order');
      errors[key] = errors[key] || [];
      errors[key].push(issue.message);
    }
    res.status(400).json({
      success: false,
      message: 'Please review your order details.',
      data: null,
      errors,
    });
    return;
  }

  const d = parsed.data;
  const resolvedItems: {
    productId: number;
    title: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    isDigital: boolean;
    hasPdf: boolean;
  }[] = [];

  let totalAmount = 0;

  const effectiveCurrency = d.paymentMethod === 'esewa' ? 'NPR' : d.currency;

  for (const item of d.items) {
    let productRow = db
      .prepare('SELECT * FROM products WHERE id = ? AND is_deleted = 0 AND is_active = 1')
      .get(item.productId) as Record<string, unknown> | undefined;

    if (!productRow && supabasePublic) {
      const { data: sbProd } = await supabasePublic
        .from('products')
        .select('*')
        .eq('id', item.productId)
        .eq('is_deleted', false)
        .eq('is_active', true)
        .maybeSingle();
      if (sbProd) productRow = sbProd as Record<string, unknown>;
    }

    if (!productRow) {
      res.status(400).json({
        success: false,
        message: 'One or more selected products are no longer available.',
        data: null,
      });
      return;
    }

    const mapped = mapProductRow(productRow);
    if (!mapped.isDigital && mapped.inventoryCount < item.quantity) {
      res.status(400).json({
        success: false,
        message: `Insufficient stock for ${mapped.title}.`,
        data: null,
      });
      return;
    }

    const unitPrice = effectiveCurrency === 'NPR' ? mapped.priceNpr : mapped.priceUsd;
    totalAmount += unitPrice * item.quantity;

    resolvedItems.push({
      productId: mapped.id,
      title: mapped.title,
      sku: mapped.sku,
      unitPrice,
      quantity: item.quantity,
      isDigital: mapped.isDigital,
      hasPdf: mapped.hasPdf,
    });
  }

  const requiresShipping = resolvedItems.some((item) => !item.isDigital);
  if (requiresShipping && d.shippingAddress.trim().length < 5) {
    res.status(400).json({
      success: false,
      message: 'Shipping address is required for physical items.',
      data: null,
      errors: { shippingAddress: ['Please provide a delivery address.'] },
    });
    return;
  }

  const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const transactionUuid =
    d.paymentMethod === 'esewa' ? `${orderNumber}-${crypto.randomBytes(3).toString('hex')}` : null;
  const itemsJson = JSON.stringify(resolvedItems);
  const roundedTotal = Math.round(totalAmount * 100) / 100;

  if (d.paymentMethod === 'esewa' && roundedTotal <= 0) {
    res.status(400).json({
      success: false,
      message: 'Order total must be greater than NPR 0 for eSewa checkout.',
      data: null,
    });
    return;
  }

  if (supabasePublic) {
    try {
      await supabasePublic.from('orders').insert({
        order_number: orderNumber,
        customer_name: sanitizePlainText(d.customerName),
        customer_email: d.customerEmail.trim(),
        customer_phone: sanitizePlainText(d.customerPhone),
        shipping_address: d.shippingAddress ? sanitizePlainText(d.shippingAddress) : null,
        payment_method: d.paymentMethod,
        payment_provider: d.paymentMethod === 'esewa' ? 'esewa' : null,
        transaction_uuid: transactionUuid,
        currency: effectiveCurrency,
        total_amount: roundedTotal,
        status: 'pending',
        notes: d.notes ? sanitizePlainText(d.notes) : null,
        items_json: itemsJson,
      });
    } catch (err) {
      console.error('Non-fatal Supabase order log error:', err);
    }
  }

  const authUser = tryGetAuthUser(req);
  const insertOrderAtomic = db.transaction(() => {
    const info = db
      .prepare(`
        INSERT INTO orders (
          order_number, user_id, customer_name, customer_email, customer_phone,
          shipping_address, payment_method, payment_provider, transaction_uuid,
          currency, total_amount, status, notes, items_json, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
      `)
      .run(
        orderNumber,
        authUser?.sub ?? null,
        sanitizePlainText(d.customerName),
        d.customerEmail.trim(),
        sanitizePlainText(d.customerPhone),
        d.shippingAddress ? sanitizePlainText(d.shippingAddress) : null,
        d.paymentMethod,
        d.paymentMethod === 'esewa' ? 'esewa' : null,
        transactionUuid,
        effectiveCurrency,
        roundedTotal,
        d.notes ? sanitizePlainText(d.notes) : null,
        itemsJson,
        idempotencyKey
      );

    // Decrement inventory atomically for non-gateway orders; eSewa orders decrement upon verified payment
    if (d.paymentMethod !== 'esewa') {
      for (const item of resolvedItems) {
        if (!item.isDigital) {
          db.prepare('UPDATE products SET inventory_count = MAX(0, inventory_count - ?) WHERE id = ?').run(
            item.quantity,
            item.productId
          );
        }
      }
    }
    return Number(info.lastInsertRowid);
  });

  const orderId = insertOrderAtomic();
  const info = { lastInsertRowid: orderId };

  let esewa: ReturnType<typeof buildEsewaInitiation> | undefined;
  if (d.paymentMethod === 'esewa' && transactionUuid) {
    const origin = resolvePublicOrigin(req);
    esewa = buildEsewaInitiation({
      totalAmountNpr: roundedTotal,
      transactionUuid,
      successUrl: `${origin}/payment/esewa/success`,
      failureUrl: `${origin}/payment/esewa/failure?order=${encodeURIComponent(orderNumber)}`,
    });
  }

  const orderTotalDisplay =
    effectiveCurrency === 'NPR' ? `NPR ${Math.round(roundedTotal).toLocaleString('en-US')}` : `$${roundedTotal.toFixed(2)}`;
  await sendTransactionalEmail({
    to: d.customerEmail.trim(),
    subject: `Order Placed: ${orderNumber}`,
    text: [
      `Hello ${sanitizePlainText(d.customerName)},`,
      '',
      `Your order ${orderNumber} has been placed.`,
      `Payment Method: ${d.paymentMethod.toUpperCase()}`,
      `Total: ${orderTotalDisplay}`,
      '',
      ...resolvedItems.map((i) => `- ${i.title} (${i.sku}) x ${i.quantity}`),
    ].join('\n'),
    eventType: 'ORDER_CREATED',
  });

  broadcastToAdmins({
    type: 'admin:notification',
    id: `order-${orderNumber}`,
    category: 'order',
    title: 'New Order Placed',
    message: `${orderNumber} (${orderTotalDisplay}) via ${d.paymentMethod.toUpperCase()} by ${sanitizePlainText(d.customerName)}`,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({
    success: true,
    message: `Order ${orderNumber} created.`,
    data: {
      id: Number(info.lastInsertRowid),
      orderNumber,
      status: 'pending',
      paymentMethod: d.paymentMethod,
      currency: effectiveCurrency,
      totalAmount: roundedTotal,
      items: resolvedItems,
      createdAt: new Date().toISOString(),
      esewa,
    },
  });
});

publicRouter.post('/payments/esewa/initiate', paymentRateLimiter, (req, res) => {
  const orderNumber = typeof req.body?.orderNumber === 'string' ? req.body.orderNumber.trim() : '';
  if (!orderNumber) {
    res.status(400).json({ success: false, message: 'Order number is required.', data: null });
    return;
  }

  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber) as
    | Record<string, unknown>
    | undefined;

  if (!order) {
    res.status(404).json({ success: false, message: 'Order not found.', data: null });
    return;
  }

  if (order.status === 'paid' || order.status === 'fulfilled') {
    res.status(400).json({ success: false, message: 'Order has already been paid.', data: null });
    return;
  }

  const transactionUuid = `${orderNumber}-${crypto.randomBytes(3).toString('hex')}`;
  const totalAmountNpr = Number(order.total_amount);

  db.prepare(
    "UPDATE orders SET payment_method = 'esewa', payment_provider = 'esewa', currency = 'NPR', transaction_uuid = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(transactionUuid, order.id);

  const origin = resolvePublicOrigin(req);
  const esewa = buildEsewaInitiation({
    totalAmountNpr,
    transactionUuid,
    successUrl: `${origin}/payment/esewa/success`,
    failureUrl: `${origin}/payment/esewa/failure?order=${encodeURIComponent(orderNumber)}`,
  });

  res.json({
    success: true,
    data: {
      orderNumber,
      totalAmount: totalAmountNpr,
      currency: 'NPR',
      esewa,
    },
  });
});

publicRouter.post('/payments/esewa/verify', paymentRateLimiter, async (req, res) => {
  const encodedData = typeof req.body?.data === 'string' ? req.body.data.trim() : '';
  if (!encodedData) {
    res.status(400).json({ success: false, message: 'Missing eSewa response payload.', data: null });
    return;
  }

  const verifiedSig = verifyEsewaCallbackPayload(encodedData);
  if (!verifiedSig.valid || !verifiedSig.payload) {
    recordSecurityEvent({
      level: 'ERROR',
      eventType: 'ESEWA_SIGNATURE_INVALID',
      ip: req.ip,
      method: req.method,
      path: req.originalUrl,
      message: verifiedSig.reason || 'Invalid eSewa cryptographic HMAC signature.',
    });
    res.status(400).json({
      success: false,
      message: verifiedSig.reason || 'Invalid eSewa payment signature.',
      data: null,
    });
    return;
  }

  const callback = verifiedSig.payload;
  const esewaCfg = getEsewaConfig();
  if (String(callback.product_code || '') !== esewaCfg.productCode) {
    recordSecurityEvent({
      level: 'ERROR',
      eventType: 'ESEWA_MERCHANT_MISMATCH',
      ip: req.ip,
      method: req.method,
      path: req.originalUrl,
      message: `Unexpected merchant product_code=${String(callback.product_code)}`,
    });
    res.status(400).json({ success: false, message: 'Merchant product code mismatch.', data: null });
    return;
  }

  const order = db
    .prepare('SELECT * FROM orders WHERE transaction_uuid = ?')
    .get(callback.transaction_uuid) as Record<string, unknown> | undefined;

  if (!order) {
    res.status(404).json({ success: false, message: 'Matching order record not found.', data: null });
    return;
  }

  const callbackAmount = Number(String(callback.total_amount).replace(/,/g, ''));
  const orderAmount = Number(order.total_amount);
  if (Math.abs(callbackAmount - orderAmount) > 0.01) {
    recordSecurityEvent({
      level: 'ERROR',
      eventType: 'PAYMENT_AMOUNT_MISMATCH',
      ip: req.ip,
      method: req.method,
      path: req.originalUrl,
      message: `Order ${String(order.order_number)} tampered amount: expected=${orderAmount}, got=${callbackAmount}`,
    });
    res.status(400).json({
      success: false,
      message: 'Verified eSewa payment amount does not match order total.',
      data: null,
    });
    return;
  }

  let gatewayStatus = String(callback.status || '');
  let refId = String(callback.transaction_code || '');

  try {
    const statusCheck = await checkEsewaTransactionStatus({
      totalAmountNpr: orderAmount,
      transactionUuid: callback.transaction_uuid,
    });
    gatewayStatus = statusCheck.status;
    if (statusCheck.ref_id) {
      refId = statusCheck.ref_id;
    }
  } catch (err) {
    res.status(502).json({
      success: false,
      message:
        err instanceof Error
          ? `Unable to confirm transaction with eSewa server: ${err.message}`
          : 'Unable to confirm transaction with eSewa server.',
      data: null,
    });
    return;
  }

  if (gatewayStatus !== 'COMPLETE') {
    res.status(400).json({
      success: false,
      message: `Transaction is not complete (status: ${gatewayStatus}).`,
      data: null,
    });
    return;
  }

  const items = JSON.parse(String(order.items_json || '[]')) as {
    productId: number;
    title: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    isDigital: boolean;
    hasPdf?: boolean;
  }[];

  // Atomic idempotent payment transition: guarantees inventory & email fire strictly once per order/refId
  const finalizePayment = db.transaction(() => {
    const existingTx = refId
      ? (db
          .prepare("SELECT id, order_id FROM payment_transactions WHERE provider = 'esewa' AND provider_ref_id = ?")
          .get(refId) as { id: number; order_id: number } | undefined)
      : undefined;

    if (existingTx) {
      return { newlyPaid: false };
    }

    const updated = db
      .prepare(
        "UPDATE orders SET status = 'paid', provider_ref_id = ?, paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND status = 'pending'"
      )
      .run(refId, order.id);

    if (updated.changes !== 1) {
      return { newlyPaid: false };
    }

    db.prepare(`
      INSERT INTO payment_transactions (order_id, provider, transaction_uuid, provider_ref_id, amount, status, raw_payload_json)
      VALUES (?, 'esewa', ?, ?, ?, 'COMPLETE', ?)
    `).run(Number(order.id), callback.transaction_uuid, refId || callback.transaction_uuid, orderAmount, JSON.stringify(callback));

    for (const item of items) {
      if (!item.isDigital) {
        db.prepare('UPDATE products SET inventory_count = MAX(0, inventory_count - ?) WHERE id = ?').run(
          item.quantity,
          item.productId
        );
      }
    }

    return { newlyPaid: true };
  });

  const { newlyPaid } = finalizePayment();

  if (newlyPaid) {
    recordAuditLog(String(order.customer_email), 'PAYMENT_VERIFIED', 'Order', Number(order.id), `eSewa Ref: ${refId}`);
    broadcastToAdmins({
      type: 'admin:notification',
      id: `pay-${String(order.order_number)}`,
      category: 'payment',
      title: 'eSewa Payment Verified',
      message: `${String(order.order_number)} · NPR ${Math.round(orderAmount).toLocaleString('en-US')} (Ref: ${refId})`,
      createdAt: new Date().toISOString(),
    });
    await sendTransactionalEmail({
      to: String(order.customer_email),
      subject: `Payment Confirmed: ${String(order.order_number)}`,
      text: [
        `Hello ${String(order.customer_name)},`,
        '',
        `Your eSewa payment for order ${String(order.order_number)} (NPR ${Math.round(orderAmount).toLocaleString('en-US')}) has been verified.`,
        `Reference ID: ${refId}`,
        '',
        ...items.map((i) => `- ${i.title} (${i.sku}) x ${i.quantity}`),
      ].join('\n'),
      eventType: 'PAYMENT_VERIFIED',
    });
  }

  res.json({
    success: true,
    message: newlyPaid ? 'eSewa payment verified.' : 'eSewa payment already verified (idempotent).',
    data: {
      id: Number(order.id),
      orderNumber: String(order.order_number),
      status: 'paid',
      paymentMethod: 'esewa',
      currency: String(order.currency),
      totalAmount: orderAmount,
      providerRefId: refId || (order.provider_ref_id ? String(order.provider_ref_id) : null),
      items,
      createdAt: String(order.created_at),
    },
  });
});

publicRouter.get('/orders/:orderNumber/receipt', (req, res) => {
  const row = db
    .prepare('SELECT * FROM orders WHERE order_number = ?')
    .get(req.params.orderNumber) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ success: false, message: 'Order not found.', data: null });
    return;
  }
  res.json({
    success: true,
    data: {
      id: Number(row.id),
      orderNumber: String(row.order_number),
      status: String(row.status),
      paymentMethod: String(row.payment_method),
      currency: String(row.currency),
      totalAmount: Number(row.total_amount),
      providerRefId: row.provider_ref_id ? String(row.provider_ref_id) : null,
      items: JSON.parse(String(row.items_json || '[]')),
      createdAt: String(row.created_at),
    },
  });
});

const cartNotifySchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(25).default(1),
  currency: z.enum(['USD', 'NPR']).default('USD'),
});

publicRouter.post('/cart/notify', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = cartNotifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid cart item payload.', data: null });
    return;
  }

  const { productId, quantity, currency } = parsed.data;
  const productRow = db
    .prepare('SELECT * FROM products WHERE id = ? AND is_deleted = 0 AND is_active = 1')
    .get(productId) as Record<string, unknown> | undefined;

  if (!productRow) {
    res.status(404).json({ success: false, message: 'Product not found.', data: null });
    return;
  }

  const product = mapProductRow(productRow);
  const unitPrice = currency === 'NPR' ? product.priceNpr : product.priceUsd;
  const lineTotal = unitPrice * quantity;
  const formattedUnit =
    currency === 'NPR' ? `NPR ${Math.round(unitPrice).toLocaleString('en-US')}` : `$${unitPrice.toFixed(2)}`;
  const formattedTotal =
    currency === 'NPR' ? `NPR ${Math.round(lineTotal).toLocaleString('en-US')}` : `$${lineTotal.toFixed(2)}`;
  const productUrl = `${resolvePublicOrigin(req)}/products/${product.slug}`;
  const customerName = req.user!.fullName || 'Customer';
  const recipientEmail = req.user!.email;

  const subject = `Added to Cart: ${product.title}`;
  const text = [
    `Hello ${customerName},`,
    '',
    `You added an item to your cart on Pramesh Bhattarai Store:`,
    `Product: ${product.title} (${product.sku})`,
    `Category: ${product.category}`,
    `Quantity: ${quantity}`,
    `Unit Price: ${formattedUnit}`,
    `Line Subtotal: ${formattedTotal}`,
    '',
    `View product: ${productUrl}`,
    '',
    `Thank you for shopping with us!`,
  ].join('\n');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e4e4e7;border-radius:12px;">
      <h2 style="margin:0 0 12px;font-size:18px;color:#09090b;">Item Added to Your Cart</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">Hello ${customerName},</p>
      <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">
        This is a confirmation that you added <strong>${product.title}</strong> to your shopping cart.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
        <tr><td style="padding:6px 0;color:#71717a;">Product</td><td style="padding:6px 0;text-align:right;font-weight:600;">${product.title}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a;">SKU</td><td style="padding:6px 0;text-align:right;">${product.sku}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a;">Quantity</td><td style="padding:6px 0;text-align:right;">${quantity}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a;">Unit Price</td><td style="padding:6px 0;text-align:right;">${formattedUnit}</td></tr>
        <tr><td style="padding:8px 0;border-top:1px solid #e4e4e7;font-weight:600;">Line Subtotal</td><td style="padding:8px 0;border-top:1px solid #e4e4e7;text-align:right;font-weight:700;">${formattedTotal}</td></tr>
      </table>
      <a href="${productUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">
        View Product &amp; Checkout
      </a>
    </div>
  `.trim();

  const mailResult = await sendTransactionalEmail({
    to: recipientEmail,
    subject,
    text,
    html,
    eventType: 'ADD_TO_CART',
  });

  recordAuditLog(
    recipientEmail,
    'CART_EMAIL',
    'Product',
    product.id,
    `${product.title} (qty ${quantity}) — ${mailResult.deliveryStatus} via ${mailResult.provider}`
  );

  res.status(200).json({
    success: true,
    message: mailResult.sent
      ? `Cart notification email sent to ${recipientEmail}.`
      : `Cart notification recorded for ${recipientEmail}.`,
    data: {
      recipientEmail,
      productId: product.id,
      productTitle: product.title,
      quantity,
      sent: mailResult.sent,
      provider: mailResult.provider,
      deliveryStatus: mailResult.deliveryStatus,
      logId: mailResult.logId,
    },
  });
});

// --- Authenticated Customer Portal (/my/*) Routes ---

function mapCustomerOrderRow(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    orderNumber: String(r.order_number),
    customerName: String(r.customer_name),
    customerEmail: String(r.customer_email),
    customerPhone: String(r.customer_phone),
    shippingAddress: r.shipping_address ? String(r.shipping_address) : null,
    paymentMethod: String(r.payment_method),
    currency: String(r.currency),
    totalAmount: Number(r.total_amount),
    transactionUuid: r.transaction_uuid ? String(r.transaction_uuid) : null,
    providerRefId: r.provider_ref_id ? String(r.provider_ref_id) : null,
    paidAt: r.paid_at ? String(r.paid_at) : null,
    status: String(r.status),
    notes: r.notes ? String(r.notes) : null,
    items: JSON.parse(String(r.items_json || '[]')),
    createdAt: String(r.created_at),
  };
}

publicRouter.get('/my/overview', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.sub;
  const email = req.user!.email.toLowerCase();

  const orderRows = db
    .prepare('SELECT * FROM orders WHERE user_id = ? OR lower(customer_email) = ? ORDER BY id DESC')
    .all(userId, email) as Record<string, unknown>[];

  const emailCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM email_logs WHERE lower(recipient_email) = ?').get(email) as { cnt: number }
  ).cnt;

  const pendingOrdersCount = orderRows.filter((o) => o.status === 'pending').length;
  const completedOrdersCount = orderRows.filter((o) => o.status === 'paid' || o.status === 'fulfilled').length;

  res.json({
    success: true,
    data: {
      ordersCount: orderRows.length,
      pendingOrdersCount,
      completedOrdersCount,
      emailsCount: emailCount,
      recentOrders: orderRows.slice(0, 5).map(mapCustomerOrderRow),
    },
  });
});

publicRouter.get('/my/orders', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.sub;
  const email = req.user!.email.toLowerCase();

  const rows = db
    .prepare('SELECT * FROM orders WHERE user_id = ? OR lower(customer_email) = ? ORDER BY id DESC')
    .all(userId, email) as Record<string, unknown>[];

  res.json({ success: true, data: rows.map(mapCustomerOrderRow) });
});

publicRouter.get('/my/emails', requireAuth, (req: AuthenticatedRequest, res) => {
  const email = req.user!.email.toLowerCase();
  const rows = db
    .prepare('SELECT * FROM email_logs WHERE lower(recipient_email) = ? ORDER BY id DESC LIMIT 100')
    .all(email) as Record<string, unknown>[];

  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      recipientEmail: String(r.recipient_email),
      eventType: String(r.event_type),
      subject: String(r.subject),
      bodyText: String(r.body_text),
      deliveryStatus: String(r.delivery_status),
      provider: String(r.provider),
      errorMessage: r.error_message ? String(r.error_message) : null,
      createdAt: String(r.created_at),
    })),
  });
});

// --- Product Ratings & Reviews ---

function resolveActiveProduct(idOrSlug: string): Record<string, unknown> | undefined {
  const isNumeric = /^\d+$/.test(idOrSlug);
  return db
    .prepare(
      isNumeric
        ? 'SELECT * FROM products WHERE id = ? AND is_deleted = 0 AND is_active = 1'
        : 'SELECT * FROM products WHERE slug = ? AND is_deleted = 0 AND is_active = 1'
    )
    .get(isNumeric ? Number(idOrSlug) : idOrSlug) as Record<string, unknown> | undefined;
}

function listProductReviews(productId: number) {
  const rows = db
    .prepare('SELECT * FROM product_reviews WHERE product_id = ? ORDER BY updated_at DESC, id DESC')
    .all(productId) as Record<string, unknown>[];
  const stats = db
    .prepare('SELECT ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS cnt FROM product_reviews WHERE product_id = ?')
    .get(productId) as { avg_rating: number | null; cnt: number } | undefined;

  return {
    averageRating: stats?.avg_rating != null ? Number(stats.avg_rating) : 0,
    reviewCount: Number(stats?.cnt || 0),
    items: rows.map((r) => ({
      id: Number(r.id),
      productId: Number(r.product_id),
      userId: Number(r.user_id),
      authorName: String(r.author_name),
      rating: Number(r.rating),
      comment: String(r.comment),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    })),
  };
}

publicRouter.get('/products/:idOrSlug/reviews', (req, res) => {
  const productRow = resolveActiveProduct(req.params.idOrSlug);
  if (!productRow) {
    res.status(404).json({ success: false, message: 'Product not found.', data: null });
    return;
  }
  res.json({ success: true, data: listProductReviews(Number(productRow.id)) });
});

publicRouter.post('/products/:idOrSlug/reviews', requireAuth, (req: AuthenticatedRequest, res) => {
  const productRow = resolveActiveProduct(req.params.idOrSlug);
  if (!productRow) {
    res.status(404).json({ success: false, message: 'Product not found.', data: null });
    return;
  }

  const schema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(3, 'Please write a short review (min 3 characters).').max(1500),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Invalid review input.',
      data: null,
    });
    return;
  }

  const productId = Number(productRow.id);
  const cleanComment = sanitizePlainText(parsed.data.comment);

  db.prepare(`
    INSERT INTO product_reviews (product_id, user_id, author_name, author_email, rating, comment)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(product_id, user_id) DO UPDATE SET
      author_name = excluded.author_name,
      rating = excluded.rating,
      comment = excluded.comment,
      updated_at = datetime('now')
  `).run(productId, req.user!.sub, req.user!.fullName, req.user!.email, parsed.data.rating, cleanComment);

  recordAuditLog(req.user!.email, 'REVIEW', 'Product', productId, `Rated ${parsed.data.rating}/5`);
  res.status(201).json({
    success: true,
    message: 'Your review and rating have been saved.',
    data: listProductReviews(productId),
  });
});

publicRouter.delete('/products/:idOrSlug/reviews/:reviewId', requireAuth, (req: AuthenticatedRequest, res) => {
  const reviewId = Number(req.params.reviewId);
  const existing = db.prepare('SELECT id, product_id, user_id FROM product_reviews WHERE id = ?').get(reviewId) as
    | { id: number; product_id: number; user_id: number }
    | undefined;

  if (!existing) {
    res.status(404).json({ success: false, message: 'Review not found.', data: null });
    return;
  }
  if (existing.user_id !== req.user!.sub && req.user!.role !== 'Admin') {
    res.status(403).json({ success: false, message: 'You can only delete your own review.', data: null });
    return;
  }
  db.prepare('DELETE FROM product_reviews WHERE id = ?').run(reviewId);
  res.json({ success: true, message: 'Review removed.', data: listProductReviews(existing.product_id) });
});

// --- Customer Wishlist ---

publicRouter.get('/my/wishlist', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db
    .prepare(`
      SELECT p.* FROM products p
      JOIN product_wishlist w ON w.product_id = p.id
      WHERE w.user_id = ? AND p.is_deleted = 0 AND p.is_active = 1
      ORDER BY w.id DESC
    `)
    .all(req.user!.sub) as Record<string, unknown>[];

  res.json({ success: true, data: rows.map(mapProductRow) });
});

publicRouter.post('/my/wishlist/toggle', requireAuth, (req: AuthenticatedRequest, res) => {
  const productId = Number(req.body?.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ success: false, message: 'Valid productId is required.', data: null });
    return;
  }

  const prod = db.prepare('SELECT id FROM products WHERE id = ? AND is_deleted = 0').get(productId) as
    | { id: number }
    | undefined;
  if (!prod) {
    res.status(404).json({ success: false, message: 'Product not found.', data: null });
    return;
  }

  const existing = db
    .prepare('SELECT id FROM product_wishlist WHERE user_id = ? AND product_id = ?')
    .get(req.user!.sub, productId) as { id: number } | undefined;

  let wishlisted = false;
  if (existing) {
    db.prepare('DELETE FROM product_wishlist WHERE id = ?').run(existing.id);
    wishlisted = false;
  } else {
    db.prepare('INSERT INTO product_wishlist (user_id, product_id) VALUES (?, ?)').run(req.user!.sub, productId);
    wishlisted = true;
  }

  const ids = (
    db.prepare('SELECT product_id FROM product_wishlist WHERE user_id = ?').all(req.user!.sub) as {
      product_id: number;
    }[]
  ).map((r) => r.product_id);

  res.json({
    success: true,
    message: wishlisted ? 'Added to wishlist.' : 'Removed from wishlist.',
    data: { wishlisted, productIds: ids },
  });
});

// --- Purchased PDF Books Library & Secure Download ---

publicRouter.get('/my/library', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.sub;
  const email = req.user!.email.toLowerCase();

  const orders = db
    .prepare(
      "SELECT order_number, status, items_json, created_at, paid_at FROM orders WHERE (user_id = ? OR lower(customer_email) = ?) AND status IN ('paid', 'fulfilled') ORDER BY id DESC"
    )
    .all(userId, email) as {
    order_number: string;
    status: string;
    items_json: string;
    created_at: string;
    paid_at: string | null;
  }[];

  const items: {
    orderNumber: string;
    productId: number;
    title: string;
    sku: string;
    category: string;
    hasPdf: boolean;
    purchasedAt: string;
  }[] = [];

  for (const ord of orders) {
    const parsedItems = JSON.parse(String(ord.items_json || '[]')) as {
      productId: number;
      title: string;
      sku: string;
    }[];
    for (const entry of parsedItems) {
      const prod = db
        .prepare('SELECT category, pdf_url FROM products WHERE id = ?')
        .get(entry.productId) as { category: string; pdf_url: string | null } | undefined;
      if (prod?.pdf_url) {
        items.push({
          orderNumber: ord.order_number,
          productId: entry.productId,
          title: entry.title,
          sku: entry.sku,
          category: prod.category,
          hasPdf: true,
          purchasedAt: ord.paid_at || ord.created_at,
        });
      }
    }
  }

  res.json({ success: true, data: items });
});

publicRouter.get(
  '/my/downloads/:orderNumber/:productId',
  downloadRateLimiter,
  requireAuth,
  (req: AuthenticatedRequest, res) => {
    const orderNumber = String(req.params.orderNumber || '').trim();
    const productId = Number(req.params.productId);

    const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber) as
      | Record<string, unknown>
      | undefined;

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.', data: null });
      return;
    }

    const isOwner =
      Number(order.user_id) === req.user!.sub ||
      String(order.customer_email || '').toLowerCase() === req.user!.email.toLowerCase();

    if (!isOwner && req.user!.role !== 'Admin') {
      recordSecurityEvent({
        level: 'WARN',
        eventType: 'PDF_DOWNLOAD_DENIED',
        ip: req.ip,
        userEmail: req.user!.email,
        method: req.method,
        path: req.originalUrl,
        message: `Blocked unauthorized PDF download attempt for order=${orderNumber}, productId=${productId}.`,
      });
      res.status(403).json({ success: false, message: 'Not authorized to download from this order.', data: null });
      return;
    }

    if (order.status !== 'paid' && order.status !== 'fulfilled' && req.user!.role !== 'Admin') {
      res.status(403).json({
        success: false,
        message: 'PDF download unlocks once payment is confirmed.',
        data: null,
      });
      return;
    }

    const items = JSON.parse(String(order.items_json || '[]')) as { productId: number }[];
    if (!items.some((i) => Number(i.productId) === productId)) {
      res.status(404).json({ success: false, message: 'Product not included in this order.', data: null });
      return;
    }

    const prod = db.prepare('SELECT title, pdf_url FROM products WHERE id = ?').get(productId) as
      | { title: string; pdf_url: string | null }
      | undefined;
    if (!prod?.pdf_url) {
      res.status(404).json({ success: false, message: 'No PDF file attached to this product.', data: null });
      return;
    }

    const candidatePath = resolvePrivatePdfPath(prod.pdf_url);
    if (!candidatePath) {
      res.status(404).json({ success: false, message: 'PDF file not found in private storage.', data: null });
      return;
    }

    const safeFilename = `${prod.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'ebook'}.pdf`;
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    recordAuditLog(req.user!.email, 'DOWNLOAD', 'PrivatePdfBook', productId, `Order ${orderNumber}`);
    res.download(candidatePath, safeFilename);
  }
);

// --- Analytics Tracking ---

const analyticsSchema = z.object({
  eventType: z.enum(['page_view', 'product_view', 'article_view']),
  path: z.string().trim().min(1).max(300),
  entityId: z.number().int().positive().nullable().optional(),
  visitorId: z.string().trim().min(4).max(120),
  referrer: z.string().trim().max(400).nullable().optional(),
});

publicRouter.post('/analytics/track', (req, res) => {
  const parsed = analyticsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid analytics payload.', data: null });
    return;
  }
  const d = parsed.data;
  db.prepare(
    'INSERT INTO analytics_events (event_type, path, entity_id, visitor_id, referrer) VALUES (?, ?, ?, ?, ?)'
  ).run(d.eventType, sanitizePlainText(d.path), d.entityId ?? null, sanitizePlainText(d.visitorId), d.referrer || null);

  res.status(201).json({ success: true, data: { tracked: true } });
});

// --- Blog Comments ---

publicRouter.get('/blog/:slug/comments', (req, res) => {
  const post = db
    .prepare('SELECT id FROM blog_posts WHERE slug = ? AND is_deleted = 0 AND published = 1')
    .get(req.params.slug) as { id: number } | undefined;

  if (!post) {
    res.status(404).json({ success: false, message: 'Article not found.', data: null });
    return;
  }

  const rows = db
    .prepare('SELECT id, post_id, author_name, comment, created_at FROM blog_comments WHERE post_id = ? AND is_approved = 1 ORDER BY id DESC')
    .all(post.id) as Record<string, unknown>[];

  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      postId: Number(r.post_id),
      authorName: String(r.author_name),
      comment: String(r.comment),
      createdAt: String(r.created_at),
    })),
  });
});

const blogCommentSchema = z.object({
  authorName: z.string().trim().min(2, 'Name is required (min 2 chars).').max(120),
  authorEmail: z.string().trim().email('Valid email address is required.').max(180),
  comment: z.string().trim().min(3, 'Comment must be at least 3 characters.').max(2000),
});

publicRouter.post('/blog/:slug/comments', (req, res) => {
  const post = db
    .prepare('SELECT id, title FROM blog_posts WHERE slug = ? AND is_deleted = 0 AND published = 1')
    .get(req.params.slug) as { id: number; title: string } | undefined;

  if (!post) {
    res.status(404).json({ success: false, message: 'Article not found.', data: null });
    return;
  }

  const parsed = blogCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Please check your comment details.',
      data: null,
    });
    return;
  }

  const cleanName = sanitizePlainText(parsed.data.authorName);
  const cleanEmail = parsed.data.authorEmail.trim().toLowerCase();
  const cleanComment = sanitizePlainText(parsed.data.comment);

  const info = db
    .prepare('INSERT INTO blog_comments (post_id, author_name, author_email, comment, is_approved) VALUES (?, ?, ?, ?, 1)')
    .run(post.id, cleanName, cleanEmail, cleanComment);

  broadcastToAdmins({
    type: 'admin:notification',
    id: `comment-${info.lastInsertRowid}`,
    category: 'comment',
    title: 'New Article Comment',
    message: `${cleanName} commented on "${post.title}"`,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({
    success: true,
    message: 'Your comment has been posted.',
    data: {
      id: Number(info.lastInsertRowid),
      postId: post.id,
      authorName: cleanName,
      comment: cleanComment,
      createdAt: new Date().toISOString(),
    },
  });
});

// --- Newsletter Subscription ---

const newsletterSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address.').max(180),
  name: z.string().trim().max(120).optional().default(''),
});

publicRouter.post('/newsletter/subscribe', async (req, res) => {
  const parsed = newsletterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Please provide a valid email.',
      data: null,
    });
    return;
  }

  const cleanEmail = parsed.data.email.toLowerCase();
  const cleanName = parsed.data.name ? sanitizePlainText(parsed.data.name) : null;

  const existing = db.prepare('SELECT id, status FROM newsletter_subscribers WHERE email = ?').get(cleanEmail) as
    | { id: number; status: string }
    | undefined;

  if (existing && existing.status === 'active') {
    res.json({
      success: true,
      message: `${cleanEmail} is already subscribed to engineering updates.`,
      data: { id: existing.id, email: cleanEmail, status: 'active', alreadySubscribed: true },
    });
    return;
  }

  let subId: number;
  if (existing) {
    db.prepare("UPDATE newsletter_subscribers SET status = 'active', name = COALESCE(?, name) WHERE id = ?").run(
      cleanName,
      existing.id
    );
    subId = existing.id;
  } else {
    const info = db
      .prepare("INSERT INTO newsletter_subscribers (email, name, status) VALUES (?, ?, 'active')")
      .run(cleanEmail, cleanName);
    subId = Number(info.lastInsertRowid);
  }

  await sendTransactionalEmail({
    to: cleanEmail,
    subject: 'Subscribed to Pramesh Bhattarai Engineering Updates',
    text: `Hello${cleanName ? ` ${cleanName}` : ''},\n\nThank you for subscribing! You will receive new tutorials on .NET, SQL architecture, and newly released digital kits & PDF books.\n`,
    eventType: 'NEWSLETTER_SUBSCRIBE',
  });

  broadcastToAdmins({
    type: 'admin:notification',
    id: `nl-${subId}`,
    category: 'newsletter',
    title: 'New Newsletter Subscriber',
    message: cleanEmail,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({
    success: true,
    message: `Subscribed ${cleanEmail} to newsletter updates.`,
    data: { id: subId, email: cleanEmail, status: 'active', alreadySubscribed: false },
  });
});

// --- Real-Time Live Support Chat ---

const chatSessionSchema = z.object({
  sessionToken: z.string().trim().min(8).max(120),
  visitorName: z.string().trim().max(120).optional(),
  visitorEmail: z.string().trim().email().max(180).optional().or(z.literal('')),
});

function mapChatMessageRow(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    conversationId: Number(r.conversation_id),
    senderRole: String(r.sender_role) as 'visitor' | 'admin',
    senderName: String(r.sender_name),
    message: String(r.message),
    messageType: String(r.message_type || 'text') as 'text' | 'voice' | 'call_log',
    mediaUrl: r.media_url ? String(r.media_url) : null,
    mediaDurationSec: r.media_duration_sec != null ? Number(r.media_duration_sec) : null,
    createdAt: String(r.created_at),
  };
}

publicRouter.post('/chat/session', (req, res) => {
  const parsed = chatSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid chat session token.', data: null });
    return;
  }

  const authUser = tryGetAuthUser(req);
  const token = parsed.data.sessionToken;
  const fallbackName = authUser?.fullName || sanitizePlainText(parsed.data.visitorName || '') || 'Visitor';
  const fallbackEmail = authUser?.email || (parsed.data.visitorEmail ? parsed.data.visitorEmail.trim().toLowerCase() : null);

  let conv = db.prepare('SELECT * FROM chat_conversations WHERE session_token = ?').get(token) as
    | Record<string, unknown>
    | undefined;

  if (!conv) {
    const info = db
      .prepare(
        "INSERT INTO chat_conversations (session_token, visitor_name, visitor_email, user_id, status) VALUES (?, ?, ?, ?, 'open')"
      )
      .run(token, fallbackName, fallbackEmail, authUser?.sub ?? null);
    conv = db.prepare('SELECT * FROM chat_conversations WHERE id = ?').get(Number(info.lastInsertRowid)) as Record<
      string,
      unknown
    >;
  } else if (authUser && (!conv.user_id || conv.visitor_name === 'Visitor')) {
    db.prepare('UPDATE chat_conversations SET visitor_name = ?, visitor_email = ?, user_id = ? WHERE id = ?').run(
      authUser.fullName,
      authUser.email,
      authUser.sub,
      conv.id
    );
    conv = db.prepare('SELECT * FROM chat_conversations WHERE id = ?').get(conv.id) as Record<string, unknown>;
  }

  const messages = (
    db.prepare('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY id ASC').all(conv.id) as Record<
      string,
      unknown
    >[]
  ).map(mapChatMessageRow);

  res.json({
    success: true,
    data: {
      conversation: {
        id: Number(conv.id),
        sessionToken: String(conv.session_token),
        visitorName: String(conv.visitor_name),
        visitorEmail: conv.visitor_email ? String(conv.visitor_email) : null,
        status: String(conv.status) as 'open' | 'closed',
        unreadAdminCount: Number(conv.unread_admin_count || 0),
        lastMessageAt: String(conv.last_message_at),
        createdAt: String(conv.created_at),
      },
      messages,
    },
  });
});

const chatMessageSchema = z.object({
  sessionToken: z.string().trim().min(8).max(120),
  visitorName: z.string().trim().min(1).max(120).optional(),
  visitorEmail: z.string().trim().email().max(180).optional().or(z.literal('')),
  message: z.string().trim().min(1, 'Message cannot be empty.').max(2000),
});

publicRouter.post('/chat/messages', (req, res) => {
  const parsed = chatMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Invalid chat message.',
      data: null,
    });
    return;
  }

  const authUser = tryGetAuthUser(req);
  const token = parsed.data.sessionToken;
  const senderName =
    sanitizePlainText(parsed.data.visitorName || '') || authUser?.fullName || 'Visitor';
  const visitorEmail =
    (parsed.data.visitorEmail ? parsed.data.visitorEmail.trim().toLowerCase() : '') ||
    authUser?.email ||
    null;
  const cleanMsg = sanitizePlainText(parsed.data.message);

  let conv = db.prepare('SELECT * FROM chat_conversations WHERE session_token = ?').get(token) as
    | Record<string, unknown>
    | undefined;

  if (!conv) {
    const info = db
      .prepare(
        "INSERT INTO chat_conversations (session_token, visitor_name, visitor_email, user_id, status) VALUES (?, ?, ?, ?, 'open')"
      )
      .run(token, senderName, visitorEmail, authUser?.sub ?? null);
    conv = db.prepare('SELECT * FROM chat_conversations WHERE id = ?').get(Number(info.lastInsertRowid)) as Record<
      string,
      unknown
    >;
  } else {
    db.prepare(
      "UPDATE chat_conversations SET visitor_name = COALESCE(NULLIF(?, ''), visitor_name), visitor_email = COALESCE(?, visitor_email), status = 'open', unread_admin_count = unread_admin_count + 1, last_message_at = datetime('now') WHERE id = ?"
    ).run(senderName, visitorEmail, conv.id);
  }

  const msgInfo = db
    .prepare(
      "INSERT INTO chat_messages (conversation_id, sender_role, sender_name, message, message_type) VALUES (?, 'visitor', ?, ?, 'text')"
    )
    .run(conv.id, senderName, cleanMsg);

  if (conv && Number(conv.unread_admin_count || 0) === 0 && msgInfo.lastInsertRowid) {
    db.prepare(
      "UPDATE chat_conversations SET unread_admin_count = MAX(1, unread_admin_count), last_message_at = datetime('now') WHERE id = ?"
    ).run(conv.id);
  }

  const savedRow = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(Number(msgInfo.lastInsertRowid)) as Record<
    string,
    unknown
  >;
  const mappedMsg = mapChatMessageRow(savedRow);

  const wsPayload = {
    type: 'chat:message' as const,
    conversationId: Number(conv.id),
    sessionToken: token,
    visitorName: senderName,
    message: mappedMsg,
  };

  broadcastToConversation(token, wsPayload);
  broadcastToAdmins(wsPayload);
  broadcastToAdmins({
    type: 'admin:notification',
    id: `chat-${mappedMsg.id}`,
    category: 'chat',
    title: 'Live Support Message',
    message: `${senderName}: ${cleanMsg.slice(0, 90)}`,
    conversationId: Number(conv.id),
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({ success: true, data: mappedMsg });
});

publicRouter.post('/chat/voice', uploadVisitorVoice.single('audio'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'Voice recording file is required.', data: null });
    return;
  }

  const mime = (req.file.mimetype || 'audio/webm').split(';')[0].trim().toLowerCase();
  if (!verifyFileMagicBytes(req.file.path, mime)) {
    fs.unlinkSync(req.file.path);
    res.status(400).json({ success: false, message: 'Invalid voice audio file signature.', data: null });
    return;
  }

  const token = typeof req.body?.sessionToken === 'string' ? req.body.sessionToken.trim() : '';
  if (!token || token.length < 8) {
    fs.unlinkSync(req.file.path);
    res.status(400).json({ success: false, message: 'Valid chat sessionToken is required.', data: null });
    return;
  }

  const authUser = tryGetAuthUser(req);
  const senderName =
    sanitizePlainText(String(req.body?.visitorName || '')) || authUser?.fullName || 'Visitor';
  const visitorEmail =
    (typeof req.body?.visitorEmail === 'string' ? req.body.visitorEmail.trim().toLowerCase() : '') ||
    authUser?.email ||
    null;
  const durationSec = Math.max(1, Math.min(600, Math.round(Number(req.body?.durationSec || 0))));
  const mediaUrl = `/api/v1/chat/voice/${req.file.filename}`;

  let conv = db.prepare('SELECT * FROM chat_conversations WHERE session_token = ?').get(token) as
    | Record<string, unknown>
    | undefined;

  if (!conv) {
    const info = db
      .prepare(
        "INSERT INTO chat_conversations (session_token, visitor_name, visitor_email, user_id, status, unread_admin_count) VALUES (?, ?, ?, ?, 'open', 1)"
      )
      .run(token, senderName, visitorEmail, authUser?.sub ?? null);
    conv = db.prepare('SELECT * FROM chat_conversations WHERE id = ?').get(Number(info.lastInsertRowid)) as Record<
      string,
      unknown
    >;
  } else {
    db.prepare(
      "UPDATE chat_conversations SET visitor_name = COALESCE(NULLIF(?, ''), visitor_name), visitor_email = COALESCE(?, visitor_email), status = 'open', unread_admin_count = unread_admin_count + 1, last_message_at = datetime('now') WHERE id = ?"
    ).run(senderName, visitorEmail, conv.id);
  }

  const msgInfo = db
    .prepare(
      "INSERT INTO chat_messages (conversation_id, sender_role, sender_name, message, message_type, media_url, media_duration_sec) VALUES (?, 'visitor', ?, ?, 'voice', ?, ?)"
    )
    .run(conv.id, senderName, `Voice message (${durationSec}s)`, mediaUrl, durationSec);

  const savedRow = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(Number(msgInfo.lastInsertRowid)) as Record<
    string,
    unknown
  >;
  const mappedMsg = mapChatMessageRow(savedRow);

  const wsPayload = {
    type: 'chat:message' as const,
    conversationId: Number(conv.id),
    sessionToken: token,
    visitorName: senderName,
    message: mappedMsg,
  };

  broadcastToConversation(token, wsPayload);
  broadcastToAdmins(wsPayload);
  broadcastToAdmins({
    type: 'admin:notification',
    id: `voice-${mappedMsg.id}`,
    category: 'chat',
    title: 'New Voice Note',
    message: `${senderName} sent a ${durationSec}s voice recording`,
    conversationId: Number(conv.id),
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({ success: true, data: mappedMsg });
});

publicRouter.get('/chat/voice/:fileName', (req, res) => {
  const filePath = resolveVoicePath(String(req.params.fileName || ''));
  if (!filePath) {
    res.status(404).json({ success: false, message: 'Voice recording not found.', data: null });
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const mime = getVoiceMimeByExt(filePath);
  const range = req.headers.range;

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Accept-Ranges', 'bytes');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = Number.parseInt(parts[0] || '0', 10);
    const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
      return;
    }
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mime,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mime,
    });
    fs.createReadStream(filePath).pipe(res);
  }
});






