import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { initializeDatabase, db } from './server/db.ts';
import { publicRouter } from './server/routes/public.ts';
import { authRouter, adminRouter } from './server/routes/admin.ts';
import { academyRouter } from './server/routes/academy.ts';
import { attachWebSocketServer } from './server/realtime.ts';
import {
  createRateLimiter,
  ensureCsrfCookie,
  recordSecurityEvent,
  startScheduledBackups,
  verifyCsrfMiddleware,
} from './server/security.ts';

async function bootstrapServer() {
  initializeDatabase();
  startScheduledBackups();

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  const PORT = Number(process.env.PORT || 3000);

  // Hardened HTTP security headers & transport protection
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=*, microphone=*, geolocation=()');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader(
      'Content-Security-Policy',
      "frame-ancestors 'self' https://*.google.com https://aistudio.google.com https://*.googleusercontent.com; object-src 'none'; base-uri 'self'"
    );
    const xfProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase();
    if (req.secure || xfProto === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Serve public image/media uploads (private PDF books live outside /public in /storage/private-books)
  const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  // SEO routes: robots.txt & dynamic sitemap.xml
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${baseUrl}/sitemap.xml\n`);
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const projects = db.prepare('SELECT slug, updated_at FROM projects WHERE is_deleted = 0').all() as {
      slug: string;
      updated_at: string;
    }[];
    const profile = db.prepare('SELECT blog_enabled FROM profile WHERE id = 1').get() as { blog_enabled: number } | undefined;
    const posts = profile?.blog_enabled
      ? (db.prepare('SELECT slug, updated_at FROM blog_posts WHERE is_deleted = 0 AND published = 1').all() as {
          slug: string;
          updated_at: string;
        }[])
      : [];

    const urls = [
      `<url><loc>${baseUrl}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
      ...projects.map(
        (p) => `<url><loc>${baseUrl}/projects/${p.slug}</loc><lastmod>${p.updated_at.slice(0, 10)}</lastmod></url>`
      ),
      ...posts.map(
        (b) => `<url><loc>${baseUrl}/blog/${b.slug}</loc><lastmod>${b.updated_at.slice(0, 10)}</lastmod></url>`
      ),
    ];

    res
      .type('application/xml')
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`);
  });

  // Global API rate limit & Anti-Forgery (CSRF) protection
  const apiRateLimiter = createRateLimiter({
    keyPrefix: 'api-global',
    windowMs: 60 * 1000,
    max: 300,
    message: 'Too many API requests from your IP. Please slow down and try again shortly.',
  });

  app.get('/api/v1/security/csrf-token', (req, res) => {
    const csrfToken = ensureCsrfCookie(req, res);
    res.json({ success: true, data: { csrfToken } });
  });

  app.use('/api/v1', apiRateLimiter, verifyCsrfMiddleware);

  // REST API v1
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1', academyRouter);
  app.use('/api/v1', publicRouter);

  // Frontend middleware / static build
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // Centralized exception handler (logs internally, never leaks SQL/stack traces)
  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const isClientUploadError =
      err.message?.includes('Unsupported file type') ||
      err.message?.includes('File too large') ||
      err.name === 'MulterError';
    const status = isClientUploadError ? 400 : 500;

    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
    recordSecurityEvent({
      level: status >= 500 ? 'ERROR' : 'WARN',
      eventType: status >= 500 ? 'SERVER_EXCEPTION' : 'BAD_UPLOAD_REQUEST',
      ip: req.ip,
      method: req.method,
      path: req.originalUrl,
      message: err.message || 'Unhandled server exception',
    });

    res.status(status).json({
      success: false,
      message: isClientUploadError ? err.message : 'An unexpected server error occurred.',
      data: null,
    });
  });

  const httpServer = http.createServer(app);
  attachWebSocketServer(httpServer);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Portfolio server running at http://localhost:${PORT}`);
  });
}

bootstrapServer();
