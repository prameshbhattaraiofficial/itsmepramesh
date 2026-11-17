import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { z } from 'zod';
import { db } from '../db.ts';
import {
  AuthenticatedRequest,
  hashToken,
  issueAccessToken,
  issueRefreshToken,
  recordAuditLog,
  requireAdmin,
  requireAuth,
  rotateRefreshToken,
} from '../auth.ts';
import { sendTransactionalEmail } from '../email.ts';
import { broadcastToAdmins, broadcastToConversation } from '../realtime.ts';
import {
  BACKUPS_DIR,
  PRIVATE_BOOKS_DIR,
  PRIVATE_VOICE_DIR,
  PUBLIC_UPLOADS_DIR,
  REFRESH_COOKIE_NAME,
  checkAccountLockout,
  clearAuthCookies,
  clearFailedLoginAttempts,
  createDatabaseBackup,
  createRateLimiter,
  listDatabaseBackups,
  parseCookies,
  recordFailedLoginAttempt,
  recordSecurityEvent,
  setRefreshTokenCookie,
  verifyFileMagicBytes,
} from '../security.ts';

export const authRouter = Router();
export const adminRouter = Router();

const authRateLimiter = createRateLimiter({
  keyPrefix: 'auth',
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: 'Too many authentication attempts. Please wait 10 minutes before trying again.',
});

const uploadsDir = PUBLIC_UPLOADS_DIR;
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(PRIVATE_BOOKS_DIR, { recursive: true });

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
      const base = path
        .basename(file.originalname, path.extname(file.originalname))
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .slice(0, 32);
      const rand = crypto.randomBytes(4).toString('hex');
      cb(null, `${Date.now()}-${rand}-${base}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed: JPG, PNG, WebP, PDF.'));
    }
  },
});

const uploadPrivatePdf = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PRIVATE_BOOKS_DIR),
    filename: (_req, file, cb) => {
      const base = path
        .basename(file.originalname, path.extname(file.originalname))
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .slice(0, 32) || 'ebook';
      const uuid = crypto.randomUUID().slice(0, 12);
      cb(null, `${Date.now()}-${uuid}-${base}.pdf`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Only valid PDF files are accepted for private book storage.'));
    }
  },
});

const uploadVoiceNote = multer({
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

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

function ensureUniqueSlug(
  table: 'projects' | 'services' | 'blog_posts' | 'products' | 'skill_categories',
  raw: string,
  excludeId?: number
): string {
  const base = slugify(raw);
  let candidate = base;
  let counter = 2;
  while (true) {
    const existing = excludeId
      ? db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`).get(candidate, excludeId)
      : db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(candidate);
    if (!existing) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

// --- Auth Routes ---

authRouter.post('/login', authRateLimiter, (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Valid email and password are required.', data: null });
    return;
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const lockout = checkAccountLockout(normalizedEmail);
  if (lockout.locked) {
    res.status(429).json({
      success: false,
      message: `Account temporarily locked due to repeated failed attempts. Try again in ${lockout.retryMinutes} minute(s).`,
      data: null,
    });
    return;
  }

  const user = db
    .prepare('SELECT id, email, password_hash, full_name, role FROM users WHERE lower(email) = ?')
    .get(normalizedEmail) as
    | { id: number; email: string; password_hash: string; full_name: string; role: string }
    | undefined;

  if (!user || !bcrypt.compareSync(parsed.data.password, user.password_hash)) {
    recordFailedLoginAttempt(normalizedEmail, req.ip);
    res.status(401).json({ success: false, message: 'Invalid email or password.', data: null });
    return;
  }

  clearFailedLoginAttempts(normalizedEmail);
  const payload = { sub: user.id, email: user.email, fullName: user.full_name, role: user.role };
  const accessToken = issueAccessToken(payload);
  const refresh = issueRefreshToken(user.id);
  setRefreshTokenCookie(req, res, refresh.token);
  recordAuditLog(user.email, 'LOGIN', 'User', user.id, `${user.role} signed in.`);

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken: refresh.token,
      expiresInSeconds: 15 * 60,
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
    },
  });
});

authRouter.post('/register', authRateLimiter, async (req, res) => {
  const schema = z.object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(120),
    email: z.string().trim().email('Please provide a valid email address.').max(180),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(120)
      .regex(/[A-Za-z]/, 'Password must include at least one letter.')
      .regex(/[0-9]/, 'Password must include at least one number.'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Please check your registration details.',
      data: null,
    });
    return;
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(normalizedEmail) as
    | { id: number }
    | undefined;
  if (existing) {
    res.status(409).json({
      success: false,
      message: 'An account with this email already exists. Please sign in instead.',
      data: null,
    });
    return;
  }

  const passwordHash = bcrypt.hashSync(parsed.data.password, 12);
  const info = db
    .prepare('INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)')
    .run(normalizedEmail, passwordHash, parsed.data.fullName, 'Customer');

  const userId = Number(info.lastInsertRowid);
  const payload = { sub: userId, email: normalizedEmail, fullName: parsed.data.fullName, role: 'Customer' };
  const accessToken = issueAccessToken(payload);
  const refresh = issueRefreshToken(userId);
  setRefreshTokenCookie(req, res, refresh.token);
  recordAuditLog(normalizedEmail, 'REGISTER', 'User', userId, 'Customer account registered.');

  const origin = process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
    ? process.env.APP_URL.replace(/\/+$/, '')
    : `${String(req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim()}://${String(req.get('x-forwarded-host') || req.get('host') || 'localhost:3000').split(',')[0].trim()}`;

  const mailResult = await sendTransactionalEmail({
    to: normalizedEmail,
    subject: 'Welcome to Pramesh Bhattarai Store — Account Created',
    text: [
      `Hello ${parsed.data.fullName},`,
      '',
      `Welcome! Your account (${normalizedEmail}) has been created successfully.`,
      `You can now browse products, add items to your cart, complete payments (including eSewa), and manage your orders from your User Dashboard:`,
      `${origin}/dashboard`,
      '',
      `Thank you for joining!`,
    ].join('\n'),
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e4e4e7;border-radius:12px;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#09090b;">Welcome to Pramesh Bhattarai Store</h2>
        <p style="margin:0 0 12px;font-size:14px;color:#3f3f46;">Hello <strong>${parsed.data.fullName}</strong>,</p>
        <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">
          Your account (<strong>${normalizedEmail}</strong>) is ready. You can browse products, add items to your cart, pay online via eSewa or other methods, and track orders inside your dashboard.
        </p>
        <a href="${origin}/dashboard" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">
          Open My Dashboard
        </a>
      </div>
    `.trim(),
    eventType: 'USER_REGISTER',
  });

  res.status(201).json({
    success: true,
    message: mailResult.sent
      ? `Account created and welcome email sent to ${normalizedEmail}.`
      : `Account created and welcome email queued for ${normalizedEmail}.`,
    data: {
      accessToken,
      refreshToken: refresh.token,
      expiresInSeconds: 15 * 60,
      user: { id: userId, email: normalizedEmail, fullName: parsed.data.fullName, role: 'Customer' },
      welcomeEmailSent: mailResult.sent,
      emailDeliveryStatus: mailResult.deliveryStatus,
    },
  });
});

authRouter.post('/refresh', authRateLimiter, (req, res) => {
  const cookies = parseCookies(req);
  const refreshToken =
    typeof req.body?.refreshToken === 'string' && req.body.refreshToken.trim()
      ? req.body.refreshToken.trim()
      : cookies[REFRESH_COOKIE_NAME] || '';
  if (!refreshToken) {
    res.status(400).json({ success: false, message: 'Refresh token is required.', data: null });
    return;
  }
  const rotated = rotateRefreshToken(refreshToken);
  if (!rotated) {
    clearAuthCookies(req, res);
    res.status(401).json({ success: false, message: 'Refresh token expired or invalid.', data: null });
    return;
  }
  setRefreshTokenCookie(req, res, rotated.refreshToken);
  res.json({
    success: true,
    data: {
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      expiresInSeconds: rotated.expiresInSeconds,
      user: {
        id: rotated.user.sub,
        email: rotated.user.email,
        fullName: rotated.user.fullName,
        role: rotated.user.role,
      },
    },
  });
});

authRouter.post('/logout', (req, res) => {
  const cookies = parseCookies(req);
  const refreshToken =
    typeof req.body?.refreshToken === 'string' && req.body.refreshToken.trim()
      ? req.body.refreshToken.trim()
      : cookies[REFRESH_COOKIE_NAME] || '';
  if (refreshToken) {
    db.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ?").run(
      hashToken(refreshToken)
    );
  }
  clearAuthCookies(req, res);
  res.json({ success: true, message: 'Signed out.', data: null });
});

authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const freshUser = db
    .prepare('SELECT id, email, full_name, role FROM users WHERE id = ?')
    .get(req.user!.sub) as { id: number; email: string; full_name: string; role: string } | undefined;

  res.json({
    success: true,
    data: freshUser
      ? { id: freshUser.id, email: freshUser.email, fullName: freshUser.full_name, role: freshUser.role }
      : {
          id: req.user!.sub,
          email: req.user!.email,
          fullName: req.user!.fullName,
          role: req.user!.role,
        },
  });
});

authRouter.patch('/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(120),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Please enter a valid full name.',
      data: null,
    });
    return;
  }

  db.prepare("UPDATE users SET full_name = ?, updated_at = datetime('now') WHERE id = ?").run(
    parsed.data.fullName,
    req.user!.sub
  );
  recordAuditLog(req.user!.email, 'UPDATE', 'UserProfile', req.user!.sub, `Updated full name to ${parsed.data.fullName}`);

  res.json({
    success: true,
    message: 'Profile updated.',
    data: {
      id: req.user!.sub,
      email: req.user!.email,
      fullName: parsed.data.fullName,
      role: req.user!.role,
    },
  });
});

authRouter.post('/change-password', requireAuth, (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'New password must be at least 8 characters.').max(120),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Invalid password input.',
      data: null,
    });
    return;
  }

  const user = db
    .prepare('SELECT id, email, password_hash FROM users WHERE id = ?')
    .get(req.user!.sub) as { id: number; email: string; password_hash: string } | undefined;

  if (!user || !bcrypt.compareSync(parsed.data.currentPassword, user.password_hash)) {
    res.status(400).json({ success: false, message: 'Current password is incorrect.', data: null });
    return;
  }

  const newHash = bcrypt.hashSync(parsed.data.newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, user.id);
  recordAuditLog(user.email, 'UPDATE', 'User', user.id, 'Changed account password.');
  res.json({ success: true, message: 'Password updated.', data: null });
});

authRouter.post('/forgot-password', authRateLimiter, async (req, res) => {
  const schema = z.object({
    email: z.string().trim().email('Please provide a valid email address.').max(180),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Valid email address is required.',
      data: null,
    });
    return;
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const user = db
    .prepare('SELECT id, email, full_name FROM users WHERE lower(email) = ?')
    .get(normalizedEmail) as { id: number; email: string; full_name: string } | undefined;

  if (!user) {
    // Prevent email enumeration while returning consistent feedback
    res.json({
      success: true,
      message: `If an account exists for ${normalizedEmail}, a 6-digit password reset code and recovery link have been sent.`,
      data: { requested: true, email: normalizedEmail, deliveryStatus: 'logged' },
    });
    return;
  }

  const otpCode = String(crypto.randomInt(100000, 999999));
  const rawToken = crypto.randomBytes(24).toString('hex');
  const otpHash = hashToken(otpCode);
  const resetTokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  db.prepare("UPDATE password_resets SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL").run(user.id);
  db.prepare(
    'INSERT INTO password_resets (user_id, email, otp_hash, reset_token_hash, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).run(user.id, normalizedEmail, otpHash, resetTokenHash, expiresAt);

  const origin =
    process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL.replace(/\/+$/, '')
      : `${String(req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim()}://${String(
          req.get('x-forwarded-host') || req.get('host') || 'localhost:3000'
        )
          .split(',')[0]
          .trim()}`;
  const resetUrl = `${origin}/forgot-password?email=${encodeURIComponent(normalizedEmail)}&token=${rawToken}`;

  const mailResult = await sendTransactionalEmail({
    to: normalizedEmail,
    subject: `Password Reset Code: ${otpCode} — Pramesh Bhattarai Portal`,
    text: [
      `Hello ${user.full_name},`,
      '',
      `We received a request to reset your password.`,
      `Your 6-digit verification code is: ${otpCode}`,
      `This code expires in 15 minutes.`,
      '',
      `Or open the direct reset link below:`,
      resetUrl,
      '',
      `If you did not request a password reset, you can safely ignore this email.`,
    ].join('\n'),
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e4e4e7;border-radius:12px;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#09090b;">Password Reset Request</h2>
        <p style="margin:0 0 12px;font-size:14px;color:#3f3f46;">Hello <strong>${user.full_name}</strong>,</p>
        <p style="margin:0 0 14px;font-size:14px;color:#3f3f46;">Use the 6-digit verification code below to reset your password (valid for 15 minutes):</p>
        <div style="font-family:monospace;font-size:26px;font-weight:700;letter-spacing:6px;padding:14px 18px;background:#f4f4f5;border-radius:8px;text-align:center;color:#111827;margin:16px 0;">
          ${otpCode}
        </div>
        <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">
          Reset Password Directly
        </a>
      </div>
    `.trim(),
    eventType: 'PASSWORD_RESET_OTP',
  });

  recordSecurityEvent({
    level: 'INFO',
    eventType: 'PASSWORD_RESET_REQUESTED',
    ip: req.ip,
    userEmail: normalizedEmail,
    method: 'POST',
    path: '/api/v1/auth/forgot-password',
    message: `Password reset OTP/token generated (delivery=${mailResult.deliveryStatus}).`,
  });
  recordAuditLog(normalizedEmail, 'PASSWORD_RESET_REQUEST', 'User', user.id, 'Requested password reset OTP.');

  res.json({
    success: true,
    message: mailResult.sent
      ? `Password reset code sent to ${normalizedEmail}. Check your inbox.`
      : `Password reset code generated and logged for ${normalizedEmail}.`,
    data: {
      requested: true,
      email: normalizedEmail,
      deliveryStatus: mailResult.deliveryStatus,
    },
  });
});

authRouter.post('/reset-password', authRateLimiter, async (req, res) => {
  const schema = z.object({
    email: z.string().trim().email('Valid email address is required.').max(180),
    codeOrToken: z.string().trim().min(6, 'Verification code or reset token is required.').max(200),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters.')
      .max(120)
      .regex(/[A-Za-z]/, 'Password must include at least one letter.')
      .regex(/[0-9]/, 'Password must include at least one number.'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Please check your reset details.',
      data: null,
    });
    return;
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const submittedHash = hashToken(parsed.data.codeOrToken);
  const candidates = db
    .prepare(
      `SELECT pr.*, u.full_name
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       WHERE lower(pr.email) = ? AND pr.used_at IS NULL
       ORDER BY pr.id DESC
       LIMIT 5`
    )
    .all(normalizedEmail) as (Record<string, unknown> & {
    id: number;
    user_id: number;
    otp_hash: string;
    reset_token_hash: string;
    expires_at: string;
    full_name: string;
  })[];

  const matched = candidates.find(
    (c) =>
      new Date(String(c.expires_at)).getTime() > Date.now() &&
      (c.otp_hash === submittedHash || c.reset_token_hash === submittedHash)
  );

  if (!matched) {
    recordSecurityEvent({
      level: 'WARN',
      eventType: 'PASSWORD_RESET_INVALID',
      ip: req.ip,
      userEmail: normalizedEmail,
      method: 'POST',
      path: '/api/v1/auth/reset-password',
      message: 'Invalid or expired password reset OTP/token submitted.',
    });
    res.status(400).json({
      success: false,
      message: 'Invalid or expired verification code / reset link. Please request a new reset code.',
      data: null,
    });
    return;
  }

  const newHash = bcrypt.hashSync(parsed.data.newPassword, 12);
  db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
      newHash,
      matched.user_id
    );
    db.prepare("UPDATE password_resets SET used_at = datetime('now') WHERE id = ?").run(matched.id);
    db.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL").run(
      matched.user_id
    );
  })();

  clearFailedLoginAttempts(normalizedEmail);
  recordAuditLog(normalizedEmail, 'PASSWORD_RESET', 'User', matched.user_id, 'Password reset completed via OTP/token.');
  recordSecurityEvent({
    level: 'INFO',
    eventType: 'PASSWORD_RESET_SUCCESS',
    ip: req.ip,
    userEmail: normalizedEmail,
    method: 'POST',
    path: '/api/v1/auth/reset-password',
    message: 'User reset account password successfully.',
  });

  await sendTransactionalEmail({
    to: normalizedEmail,
    subject: 'Your Password Was Reset — Pramesh Bhattarai Portal',
    text: `Hello ${matched.full_name},\n\nYour password has been successfully updated. If you did not perform this change, please contact support immediately.`,
    eventType: 'PASSWORD_RESET_COMPLETED',
  });

  res.json({
    success: true,
    message: 'Password has been reset successfully. You can now sign in with your new password.',
    data: { reset: true },
  });
});

// --- Protected Admin Routes ---

adminRouter.use(requireAdmin);

adminRouter.get('/overview', (_req, res) => {
  const count = (sql: string) => (db.prepare(sql).get() as { cnt: number }).cnt;
  const profile = db.prepare('SELECT blog_enabled FROM profile WHERE id = 1').get() as { blog_enabled: number };
  const recentLogs = db
    .prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 15')
    .all() as Record<string, unknown>[];

  res.json({
    success: true,
    data: {
      projectsCount: count('SELECT COUNT(*) as cnt FROM projects WHERE is_deleted = 0'),
      productsCount: count('SELECT COUNT(*) as cnt FROM products WHERE is_deleted = 0'),
      ordersCount: count('SELECT COUNT(*) as cnt FROM orders'),
      pendingOrdersCount: count("SELECT COUNT(*) as cnt FROM orders WHERE status = 'pending'"),
      experiencesCount: count('SELECT COUNT(*) as cnt FROM experiences WHERE is_deleted = 0'),
      skillCategoriesCount: count('SELECT COUNT(*) as cnt FROM skill_categories'),
      skillsCount: count('SELECT COUNT(*) as cnt FROM skills'),
      educationCount: count('SELECT COUNT(*) as cnt FROM education WHERE is_deleted = 0'),
      certificationsCount: count('SELECT COUNT(*) as cnt FROM certifications WHERE is_deleted = 0'),
      achievementsCount: count('SELECT COUNT(*) as cnt FROM achievements WHERE is_deleted = 0'),
      servicesCount: count('SELECT COUNT(*) as cnt FROM services WHERE is_deleted = 0'),
      testimonialsCount: count('SELECT COUNT(*) as cnt FROM testimonials WHERE is_deleted = 0'),
      unreadMessagesCount: count("SELECT COUNT(*) as cnt FROM contact_messages WHERE status = 'unread'"),
      mediaCount: count('SELECT COUNT(*) as cnt FROM media_files'),
      blogPostsCount: count('SELECT COUNT(*) as cnt FROM blog_posts WHERE is_deleted = 0'),
      blogEnabled: Boolean(profile?.blog_enabled),
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        userEmail: l.user_email,
        action: l.action,
        entityType: l.entity_type,
        entityId: l.entity_id,
        details: l.details,
        createdAt: l.created_at,
      })),
    },
  });
});

adminRouter.put('/profile', (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    fullName: z.string().min(2).max(120),
    headline: z.string().min(2).max(200),
    tagline: z.string().min(2).max(300),
    bio: z.string().min(10).max(3000),
    careerObjective: z.string().min(10).max(1500),
    email: z.string().email(),
    phonePrimary: z.string().max(40),
    phoneSecondary: z.string().max(40),
    location: z.string().max(150),
    permanentAddress: z.string().max(150),
    avatarUrl: z.string().max(500),
    cvUrl: z.string().max(500),
    linkedinUrl: z.string().max(300),
    githubPrimaryUrl: z.string().max(300),
    githubSecondaryUrl: z.string().max(300),
    availability: z.string().max(200),
    languagesJson: z.string().max(2000).optional(),
    referenceName: z.string().max(200).optional(),
    referenceRole: z.string().max(200).optional(),
    referencePhone: z.string().max(100).optional(),
    yearsExperienceLabel: z.string().max(60),
    blogEnabled: z.boolean(),
    seoTitle: z.string().max(200),
    seoDescription: z.string().max(400),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid profile fields.', data: null });
    return;
  }
  const existing = db.prepare('SELECT languages_json, reference_name, reference_role, reference_phone FROM profile WHERE id = 1').get() as {
    languages_json: string;
    reference_name: string;
    reference_role: string;
    reference_phone: string;
  };
  const d = parsed.data;
  db.prepare(`
    UPDATE profile SET
      full_name = ?, headline = ?, tagline = ?, bio = ?, career_objective = ?,
      email = ?, phone_primary = ?, phone_secondary = ?, location = ?, permanent_address = ?,
      avatar_url = ?, cv_url = ?, linkedin_url = ?, github_primary_url = ?, github_secondary_url = ?,
      availability = ?, languages_json = ?, reference_name = ?, reference_role = ?, reference_phone = ?,
      years_experience_label = ?, blog_enabled = ?, seo_title = ?, seo_description = ?,
      updated_at = datetime('now')
    WHERE id = 1
  `).run(
    d.fullName, d.headline, d.tagline, d.bio, d.careerObjective,
    d.email, d.phonePrimary, d.phoneSecondary, d.location, d.permanentAddress,
    d.avatarUrl, d.cvUrl, d.linkedinUrl, d.githubPrimaryUrl, d.githubSecondaryUrl,
    d.availability,
    d.languagesJson ?? existing.languages_json,
    d.referenceName ?? existing.reference_name,
    d.referenceRole ?? existing.reference_role,
    d.referencePhone ?? existing.reference_phone,
    d.yearsExperienceLabel, d.blogEnabled ? 1 : 0, d.seoTitle, d.seoDescription
  );
  recordAuditLog(req.user!.email, 'UPDATE', 'Profile', 1, `Updated profile & SEO (blogEnabled=${d.blogEnabled})`);
  res.json({ success: true, message: 'Profile updated.', data: d });
});

// --- Projects CRUD ---

const projectSchema = z.object({
  title: z.string().min(2).max(200),
  slug: z.string().max(220).optional(),
  category: z.string().min(2).max(80),
  shortDescription: z.string().min(5).max(500),
  fullDescription: z.string().min(5).max(8000),
  architectureNotes: z.string().max(4000).default(''),
  imageUrl: z.string().max(500).nullable().optional(),
  githubUrl: z.string().max(400).nullable().optional(),
  liveDemoUrl: z.string().max(400).nullable().optional(),
  technologies: z.array(z.string().min(1).max(60)).default([]),
  featured: z.boolean().default(false),
  isPlaceholder: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
});

adminRouter.post('/projects', (req: AuthenticatedRequest, res) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid project payload.', data: null });
    return;
  }
  const d = parsed.data;
  const slug = ensureUniqueSlug('projects', d.slug || d.title);
  const info = db
    .prepare(`
      INSERT INTO projects (
        title, slug, category, short_description, full_description, architecture_notes,
        image_url, github_url, live_demo_url, featured, is_placeholder, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      d.title, slug, d.category, d.shortDescription, d.fullDescription, d.architectureNotes,
      d.imageUrl || null, d.githubUrl || null, d.liveDemoUrl || null,
      d.featured ? 1 : 0, d.isPlaceholder ? 1 : 0, d.displayOrder
    );
  const projectId = Number(info.lastInsertRowid);
  const insTech = db.prepare('INSERT INTO project_technologies (project_id, technology_name) VALUES (?, ?)');
  d.technologies.forEach((t) => insTech.run(projectId, t.trim()));

  recordAuditLog(req.user!.email, 'CREATE', 'Project', projectId, `Created project: ${d.title}`);
  res.status(201).json({ success: true, message: 'Project created.', data: { id: projectId, slug } });
});

adminRouter.put('/projects/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid project payload.', data: null });
    return;
  }
  const d = parsed.data;
  const slug = ensureUniqueSlug('projects', d.slug || d.title, id);
  db.prepare(`
    UPDATE projects SET
      title = ?, slug = ?, category = ?, short_description = ?, full_description = ?, architecture_notes = ?,
      image_url = ?, github_url = ?, live_demo_url = ?, featured = ?, is_placeholder = ?, display_order = ?,
      updated_at = datetime('now')
    WHERE id = ? AND is_deleted = 0
  `).run(
    d.title, slug, d.category, d.shortDescription, d.fullDescription, d.architectureNotes,
    d.imageUrl || null, d.githubUrl || null, d.liveDemoUrl || null,
    d.featured ? 1 : 0, d.isPlaceholder ? 1 : 0, d.displayOrder, id
  );
  db.prepare('DELETE FROM project_technologies WHERE project_id = ?').run(id);
  const insTech = db.prepare('INSERT INTO project_technologies (project_id, technology_name) VALUES (?, ?)');
  d.technologies.forEach((t) => insTech.run(id, t.trim()));

  recordAuditLog(req.user!.email, 'UPDATE', 'Project', id, `Updated project: ${d.title}`);
  res.json({ success: true, message: 'Project updated.', data: { id, slug } });
});

adminRouter.delete('/projects/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE projects SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?").run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'Project', id, 'Soft-deleted project');
  res.json({ success: true, message: 'Project removed.', data: null });
});

// --- Experiences CRUD ---

const experienceSchema = z.object({
  company: z.string().min(2).max(150),
  position: z.string().min(2).max(150),
  location: z.string().min(2).max(150),
  startDate: z.string().min(2).max(60),
  endDate: z.string().max(60).nullable().optional(),
  durationLabel: z.string().min(2).max(60),
  summary: z.string().min(5).max(1000),
  responsibilities: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  displayOrder: z.number().int().default(0),
});

adminRouter.post('/experiences', (req: AuthenticatedRequest, res) => {
  const parsed = experienceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid experience payload.', data: null });
    return;
  }
  const d = parsed.data;
  const info = db
    .prepare(`
      INSERT INTO experiences (
        company, position, location, start_date, end_date, duration_label,
        summary, responsibilities_json, achievements_json, technologies_json, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      d.company, d.position, d.location, d.startDate, d.endDate || 'Present', d.durationLabel,
      d.summary, JSON.stringify(d.responsibilities), JSON.stringify(d.achievements), JSON.stringify(d.technologies),
      d.displayOrder
    );
  recordAuditLog(req.user!.email, 'CREATE', 'Experience', Number(info.lastInsertRowid), d.company);
  res.status(201).json({ success: true, message: 'Experience created.', data: { id: Number(info.lastInsertRowid) } });
});

adminRouter.put('/experiences/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = experienceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid experience payload.', data: null });
    return;
  }
  const d = parsed.data;
  db.prepare(`
    UPDATE experiences SET
      company = ?, position = ?, location = ?, start_date = ?, end_date = ?, duration_label = ?,
      summary = ?, responsibilities_json = ?, achievements_json = ?, technologies_json = ?,
      display_order = ?, updated_at = datetime('now')
    WHERE id = ? AND is_deleted = 0
  `).run(
    d.company, d.position, d.location, d.startDate, d.endDate || 'Present', d.durationLabel,
    d.summary, JSON.stringify(d.responsibilities), JSON.stringify(d.achievements), JSON.stringify(d.technologies),
    d.displayOrder, id
  );
  recordAuditLog(req.user!.email, 'UPDATE', 'Experience', id, d.company);
  res.json({ success: true, message: 'Experience updated.', data: { id } });
});

adminRouter.delete('/experiences/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE experiences SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?").run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'Experience', id, 'Soft-deleted experience');
  res.json({ success: true, message: 'Experience deleted.', data: null });
});

// --- Education & Certifications CRUD ---

const educationSchema = z.object({
  institution: z.string().min(2).max(200),
  affiliatedUniversity: z.string().max(200).nullable().optional(),
  degree: z.string().min(2).max(200),
  graduationYear: z.string().min(2).max(50),
  grade: z.string().max(50).nullable().optional(),
  highlights: z.array(z.string()).default([]),
  displayOrder: z.number().int().default(0),
});

adminRouter.post('/education', (req: AuthenticatedRequest, res) => {
  const parsed = educationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid education payload.', data: null });
    return;
  }
  const d = parsed.data;
  const info = db
    .prepare(`
      INSERT INTO education (institution, affiliated_university, degree, graduation_year, grade, highlights_json, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(d.institution, d.affiliatedUniversity || null, d.degree, d.graduationYear, d.grade || null, JSON.stringify(d.highlights), d.displayOrder);
  recordAuditLog(req.user!.email, 'CREATE', 'Education', Number(info.lastInsertRowid), d.degree);
  res.status(201).json({ success: true, message: 'Education added.', data: { id: Number(info.lastInsertRowid) } });
});

adminRouter.put('/education/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = educationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid education payload.', data: null });
    return;
  }
  const d = parsed.data;
  db.prepare(`
    UPDATE education SET institution = ?, affiliated_university = ?, degree = ?, graduation_year = ?, grade = ?, highlights_json = ?, display_order = ?, updated_at = datetime('now')
    WHERE id = ? AND is_deleted = 0
  `).run(d.institution, d.affiliatedUniversity || null, d.degree, d.graduationYear, d.grade || null, JSON.stringify(d.highlights), d.displayOrder, id);
  recordAuditLog(req.user!.email, 'UPDATE', 'Education', id, d.degree);
  res.json({ success: true, message: 'Education updated.', data: { id } });
});

adminRouter.delete('/education/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE education SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?").run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'Education', id, 'Soft-deleted education');
  res.json({ success: true, message: 'Education deleted.', data: null });
});

const certSchema = z.object({
  title: z.string().min(2).max(200),
  issuer: z.string().min(2).max(200),
  issueDate: z.string().min(2).max(60),
  duration: z.string().max(60).nullable().optional(),
  credentialUrl: z.string().max(400).nullable().optional(),
  displayOrder: z.number().int().default(0),
});

adminRouter.post('/certifications', (req: AuthenticatedRequest, res) => {
  const parsed = certSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid certification payload.', data: null });
    return;
  }
  const d = parsed.data;
  const info = db
    .prepare('INSERT INTO certifications (title, issuer, issue_date, duration, credential_url, display_order) VALUES (?, ?, ?, ?, ?, ?)')
    .run(d.title, d.issuer, d.issueDate, d.duration || null, d.credentialUrl || null, d.displayOrder);
  recordAuditLog(req.user!.email, 'CREATE', 'Certification', Number(info.lastInsertRowid), d.title);
  res.status(201).json({ success: true, message: 'Certification added.', data: { id: Number(info.lastInsertRowid) } });
});

adminRouter.put('/certifications/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = certSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid certification payload.', data: null });
    return;
  }
  const d = parsed.data;
  db.prepare(
    "UPDATE certifications SET title = ?, issuer = ?, issue_date = ?, duration = ?, credential_url = ?, display_order = ?, updated_at = datetime('now') WHERE id = ? AND is_deleted = 0"
  ).run(d.title, d.issuer, d.issueDate, d.duration || null, d.credentialUrl || null, d.displayOrder, id);
  recordAuditLog(req.user!.email, 'UPDATE', 'Certification', id, d.title);
  res.json({ success: true, message: 'Certification updated.', data: { id } });
});

adminRouter.delete('/certifications/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE certifications SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?").run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'Certification', id, 'Soft-deleted certification');
  res.json({ success: true, message: 'Certification deleted.', data: null });
});

// --- Achievements CRUD ---

const achievementSchema = z.object({
  title: z.string().min(2).max(200),
  category: z.string().min(2).max(80),
  metricLabel: z.string().max(60).nullable().optional(),
  organization: z.string().min(2).max(200),
  achievedDate: z.string().min(2).max(60),
  description: z.string().min(5).max(800),
  displayOrder: z.number().int().default(0),
});

adminRouter.post('/achievements', (req: AuthenticatedRequest, res) => {
  const parsed = achievementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid achievement payload.', data: null });
    return;
  }
  const d = parsed.data;
  const info = db
    .prepare(
      'INSERT INTO achievements (title, category, metric_label, organization, achieved_date, description, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(d.title, d.category, d.metricLabel || null, d.organization, d.achievedDate, d.description, d.displayOrder);
  recordAuditLog(req.user!.email, 'CREATE', 'Achievement', Number(info.lastInsertRowid), d.title);
  res.status(201).json({ success: true, message: 'Achievement added.', data: { id: Number(info.lastInsertRowid) } });
});

adminRouter.put('/achievements/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = achievementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid achievement payload.', data: null });
    return;
  }
  const d = parsed.data;
  db.prepare(
    "UPDATE achievements SET title = ?, category = ?, metric_label = ?, organization = ?, achieved_date = ?, description = ?, display_order = ?, updated_at = datetime('now') WHERE id = ? AND is_deleted = 0"
  ).run(d.title, d.category, d.metricLabel || null, d.organization, d.achievedDate, d.description, d.displayOrder, id);
  recordAuditLog(req.user!.email, 'UPDATE', 'Achievement', id, d.title);
  res.json({ success: true, message: 'Achievement updated.', data: { id } });
});

adminRouter.delete('/achievements/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE achievements SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?").run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'Achievement', id, 'Soft-deleted achievement');
  res.json({ success: true, message: 'Achievement deleted.', data: null });
});

// --- Skill Categories & Skills CRUD ---

const skillCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  displayOrder: z.number().int().default(0),
});

adminRouter.post('/skill-categories', (req: AuthenticatedRequest, res) => {
  const parsed = skillCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Category name must be at least 2 characters.', data: null });
    return;
  }
  const existing = db.prepare('SELECT id FROM skill_categories WHERE LOWER(name) = LOWER(?)').get(parsed.data.name);
  if (existing) {
    res.status(400).json({ success: false, message: 'Skill category already exists.', data: null });
    return;
  }
  const slug = ensureUniqueSlug('skill_categories', parsed.data.name);
  const info = db
    .prepare('INSERT INTO skill_categories (name, slug, display_order) VALUES (?, ?, ?)')
    .run(parsed.data.name, slug, parsed.data.displayOrder);
  recordAuditLog(req.user!.email, 'CREATE', 'SkillCategory', Number(info.lastInsertRowid), parsed.data.name);
  res.status(201).json({ success: true, message: 'Skill category created.', data: { id: Number(info.lastInsertRowid) } });
});

adminRouter.put('/skill-categories/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = skillCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Category name must be at least 2 characters.', data: null });
    return;
  }
  const slug = ensureUniqueSlug('skill_categories', parsed.data.name, id);
  db.prepare('UPDATE skill_categories SET name = ?, slug = ?, display_order = ? WHERE id = ?').run(
    parsed.data.name,
    slug,
    parsed.data.displayOrder,
    id
  );
  recordAuditLog(req.user!.email, 'UPDATE', 'SkillCategory', id, parsed.data.name);
  res.json({ success: true, message: 'Skill category updated.', data: { id } });
});

adminRouter.delete('/skill-categories/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM skill_categories WHERE id = ?').run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'SkillCategory', id, 'Deleted skill category');
  res.json({ success: true, message: 'Skill category deleted.', data: null });
});

const skillSchema = z.object({
  categoryId: z.number().int(),
  name: z.string().trim().min(1).max(80),
  description: z.string().max(300).nullable().optional(),
  displayOrder: z.number().int().default(0),
});

adminRouter.post('/skills', (req: AuthenticatedRequest, res) => {
  const parsed = skillSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid skill payload.', data: null });
    return;
  }
  const d = parsed.data;
  const dup = db.prepare('SELECT id FROM skills WHERE LOWER(name) = LOWER(?)').get(d.name);
  if (dup) {
    res.status(400).json({ success: false, message: `Skill "${d.name}" already exists.`, data: null });
    return;
  }
  const info = db
    .prepare('INSERT INTO skills (category_id, name, description, display_order) VALUES (?, ?, ?, ?)')
    .run(d.categoryId, d.name, d.description || null, d.displayOrder);
  recordAuditLog(req.user!.email, 'CREATE', 'Skill', Number(info.lastInsertRowid), d.name);
  res.status(201).json({ success: true, message: 'Skill created.', data: { id: Number(info.lastInsertRowid) } });
});

adminRouter.put('/skills/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = skillSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid skill payload.', data: null });
    return;
  }
  const d = parsed.data;
  const dup = db.prepare('SELECT id FROM skills WHERE LOWER(name) = LOWER(?) AND id != ?').get(d.name, id);
  if (dup) {
    res.status(400).json({ success: false, message: `Skill "${d.name}" already exists.`, data: null });
    return;
  }
  db.prepare("UPDATE skills SET category_id = ?, name = ?, description = ?, display_order = ?, updated_at = datetime('now') WHERE id = ?").run(
    d.categoryId,
    d.name,
    d.description || null,
    d.displayOrder,
    id
  );
  recordAuditLog(req.user!.email, 'UPDATE', 'Skill', id, d.name);
  res.json({ success: true, message: 'Skill updated.', data: { id } });
});

adminRouter.delete('/skills/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM skills WHERE id = ?').run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'Skill', id, 'Deleted skill');
  res.json({ success: true, message: 'Skill deleted.', data: null });
});

// --- Services CRUD ---

const serviceSchema = z.object({
  title: z.string().min(2).max(160),
  shortDescription: z.string().min(5).max(500),
  deliverables: z.array(z.string()).default([]),
  displayOrder: z.number().int().default(0),
});

adminRouter.post('/services', (req: AuthenticatedRequest, res) => {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid service payload.', data: null });
    return;
  }
  const d = parsed.data;
  const slug = ensureUniqueSlug('services', d.title);
  const info = db
    .prepare('INSERT INTO services (title, slug, short_description, deliverables_json, display_order) VALUES (?, ?, ?, ?, ?)')
    .run(d.title, slug, d.shortDescription, JSON.stringify(d.deliverables), d.displayOrder);
  recordAuditLog(req.user!.email, 'CREATE', 'Service', Number(info.lastInsertRowid), d.title);
  res.status(201).json({ success: true, message: 'Service created.', data: { id: Number(info.lastInsertRowid) } });
});

adminRouter.put('/services/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid service payload.', data: null });
    return;
  }
  const d = parsed.data;
  const slug = ensureUniqueSlug('services', d.title, id);
  db.prepare(
    "UPDATE services SET title = ?, slug = ?, short_description = ?, deliverables_json = ?, display_order = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(d.title, slug, d.shortDescription, JSON.stringify(d.deliverables), d.displayOrder, id);
  recordAuditLog(req.user!.email, 'UPDATE', 'Service', id, d.title);
  res.json({ success: true, message: 'Service updated.', data: { id } });
});

adminRouter.delete('/services/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE services SET is_deleted = 1 WHERE id = ?').run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'Service', id, 'Soft-deleted service');
  res.json({ success: true, message: 'Service deleted.', data: null });
});

// --- Testimonials CRUD ---

const testimonialSchema = z.object({
  authorName: z.string().min(2).max(120),
  authorRole: z.string().min(2).max(120),
  organization: z.string().min(2).max(150),
  quote: z.string().min(10).max(1500),
  isPlaceholder: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
});

adminRouter.post('/testimonials', (req: AuthenticatedRequest, res) => {
  const parsed = testimonialSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid testimonial payload.', data: null });
    return;
  }
  const d = parsed.data;
  const info = db
    .prepare(
      'INSERT INTO testimonials (author_name, author_role, organization, quote, is_placeholder, display_order) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(d.authorName, d.authorRole, d.organization, d.quote, d.isPlaceholder ? 1 : 0, d.displayOrder);
  recordAuditLog(req.user!.email, 'CREATE', 'Testimonial', Number(info.lastInsertRowid), d.authorName);
  res.status(201).json({ success: true, message: 'Testimonial created.', data: { id: Number(info.lastInsertRowid) } });
});

adminRouter.put('/testimonials/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = testimonialSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid testimonial payload.', data: null });
    return;
  }
  const d = parsed.data;
  db.prepare(
    "UPDATE testimonials SET author_name = ?, author_role = ?, organization = ?, quote = ?, is_placeholder = ?, display_order = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(d.authorName, d.authorRole, d.organization, d.quote, d.isPlaceholder ? 1 : 0, d.displayOrder, id);
  recordAuditLog(req.user!.email, 'UPDATE', 'Testimonial', id, d.authorName);
  res.json({ success: true, message: 'Testimonial updated.', data: { id } });
});

adminRouter.delete('/testimonials/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE testimonials SET is_deleted = 1 WHERE id = ?').run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'Testimonial', id, 'Deleted testimonial');
  res.json({ success: true, message: 'Testimonial deleted.', data: null });
});

// --- Blog CRUD (Admin) ---

adminRouter.get('/blog', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT bp.*, bc.name AS category_name
      FROM blog_posts bp
      JOIN blog_categories bc ON bc.id = bp.category_id
      WHERE bp.is_deleted = 0
      ORDER BY bp.created_at DESC
    `)
    .all() as Record<string, unknown>[];

  res.json({
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt,
      content: r.content,
      categoryName: r.category_name,
      tags: JSON.parse(String(r.tags_json || '[]')),
      featuredImageUrl: r.featured_image_url,
      seoTitle: r.seo_title,
      seoDescription: r.seo_description,
      published: Boolean(r.published),
      publishedAt: r.published_at,
      createdAt: r.created_at,
    })),
  });
});

adminRouter.post('/blog', (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    title: z.string().min(3).max(200),
    excerpt: z.string().min(10).max(500),
    content: z.string().min(10).max(20000),
    categoryName: z.string().min(2).max(80).default('Architecture & .NET'),
    tags: z.array(z.string()).default([]),
    featuredImageUrl: z.string().nullable().optional(),
    seoTitle: z.string().nullable().optional(),
    seoDescription: z.string().nullable().optional(),
    published: z.boolean().default(false),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid blog post payload.', data: null });
    return;
  }
  const d = parsed.data;
  const catSlug = slugify(d.categoryName);
  let cat = db.prepare('SELECT id FROM blog_categories WHERE slug = ?').get(catSlug) as { id: number } | undefined;
  if (!cat) {
    const insCat = db.prepare('INSERT INTO blog_categories (name, slug) VALUES (?, ?)').run(d.categoryName, catSlug);
    cat = { id: Number(insCat.lastInsertRowid) };
  }
  const slug = ensureUniqueSlug('blog_posts', d.title);
  const info = db
    .prepare(`
      INSERT INTO blog_posts (title, slug, excerpt, content, category_id, tags_json, featured_image_url, seo_title, seo_description, published, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      d.title, slug, d.excerpt, d.content, cat.id, JSON.stringify(d.tags),
      d.featuredImageUrl || null, d.seoTitle || d.title, d.seoDescription || d.excerpt,
      d.published ? 1 : 0, d.published ? new Date().toISOString() : null
    );
  recordAuditLog(req.user!.email, 'CREATE', 'BlogPost', Number(info.lastInsertRowid), d.title);
  res.status(201).json({ success: true, message: 'Blog post created.', data: { id: Number(info.lastInsertRowid), slug } });
});

adminRouter.put('/blog/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ success: false, message: 'Post not found.', data: null });
    return;
  }

  const published = req.body?.published !== undefined ? Boolean(req.body.published) : Boolean(existing.published);
  const title = typeof req.body?.title === 'string' && req.body.title.trim() ? req.body.title.trim() : String(existing.title);
  const excerpt = typeof req.body?.excerpt === 'string' && req.body.excerpt.trim() ? req.body.excerpt.trim() : String(existing.excerpt);
  const content = typeof req.body?.content === 'string' && req.body.content.trim() ? req.body.content.trim() : String(existing.content);
  const tagsJson = Array.isArray(req.body?.tags) ? JSON.stringify(req.body.tags) : String(existing.tags_json || '[]');
  const featuredImageUrl =
    req.body?.featuredImageUrl !== undefined ? req.body.featuredImageUrl || null : existing.featured_image_url;
  const seoTitle = req.body?.seoTitle !== undefined ? req.body.seoTitle || title : existing.seo_title;
  const seoDescription =
    req.body?.seoDescription !== undefined ? req.body.seoDescription || excerpt : existing.seo_description;

  let categoryId = Number(existing.category_id);
  if (typeof req.body?.categoryName === 'string' && req.body.categoryName.trim()) {
    const catName = req.body.categoryName.trim();
    const catSlug = slugify(catName);
    let cat = db.prepare('SELECT id FROM blog_categories WHERE slug = ?').get(catSlug) as { id: number } | undefined;
    if (!cat) {
      const insCat = db.prepare('INSERT INTO blog_categories (name, slug) VALUES (?, ?)').run(catName, catSlug);
      cat = { id: Number(insCat.lastInsertRowid) };
    }
    categoryId = cat.id;
  }

  const slug =
    title !== existing.title ? ensureUniqueSlug('blog_posts', title, id) : String(existing.slug);

  db.prepare(`
    UPDATE blog_posts SET
      title = ?, slug = ?, excerpt = ?, content = ?, category_id = ?, tags_json = ?,
      featured_image_url = ?, seo_title = ?, seo_description = ?,
      published = ?, published_at = COALESCE(published_at, ?), updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title,
    slug,
    excerpt,
    content,
    categoryId,
    tagsJson,
    featuredImageUrl,
    seoTitle,
    seoDescription,
    published ? 1 : 0,
    published ? new Date().toISOString() : null,
    id
  );
  recordAuditLog(req.user!.email, 'UPDATE', 'BlogPost', id, `Updated post: ${title} (published=${published})`);
  res.json({ success: true, message: 'Blog post updated.', data: { id, slug } });
});

adminRouter.delete('/blog/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE blog_posts SET is_deleted = 1 WHERE id = ?').run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'BlogPost', id, 'Deleted blog post');
  res.json({ success: true, message: 'Blog post deleted.', data: null });
});

// --- Contact Messages Inbox ---

adminRouter.get('/messages', (_req, res) => {
  const rows = db.prepare('SELECT * FROM contact_messages ORDER BY id DESC').all() as Record<string, unknown>[];
  res.json({
    success: true,
    data: rows.map((m) => ({
      id: m.id,
      senderName: m.sender_name,
      senderEmail: m.sender_email,
      subject: m.subject,
      message: m.message,
      status: m.status,
      createdAt: m.created_at,
    })),
  });
});

adminRouter.patch('/messages/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const status = req.body?.status;
  if (!['unread', 'read', 'archived'].includes(status)) {
    res.status(400).json({ success: false, message: 'Invalid status.', data: null });
    return;
  }
  db.prepare('UPDATE contact_messages SET status = ? WHERE id = ?').run(status, id);
  recordAuditLog(req.user!.email, 'UPDATE', 'ContactMessage', id, `Marked as ${status}`);
  res.json({ success: true, message: 'Message status updated.', data: { id, status } });
});

adminRouter.delete('/messages/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM contact_messages WHERE id = ?').run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'ContactMessage', id, 'Deleted contact message');
  res.json({ success: true, message: 'Message deleted.', data: null });
});

// --- Media Upload ---

adminRouter.get('/media', (_req, res) => {
  const rows = db.prepare('SELECT * FROM media_files ORDER BY id DESC').all() as Record<string, unknown>[];
  res.json({
    success: true,
    data: rows.map((m) => ({
      id: m.id,
      fileName: m.file_name,
      originalName: m.original_name,
      mimeType: m.mime_type,
      sizeBytes: m.size_bytes,
      url: m.url,
      createdAt: m.created_at,
    })),
  });
});

adminRouter.post('/media', upload.single('file'), (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No valid file uploaded.', data: null });
    return;
  }

  if (!verifyFileMagicBytes(req.file.path, req.file.mimetype)) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    recordSecurityEvent({
      level: 'WARN',
      eventType: 'UPLOAD_SIGNATURE_MISMATCH',
      ip: req.ip,
      userEmail: req.user?.email,
      method: req.method,
      path: req.originalUrl,
      message: `Rejected spoofed file upload (${req.file.originalname}, declared=${req.file.mimetype}).`,
    });
    res.status(400).json({
      success: false,
      message: 'File content failed magic-byte signature validation.',
      data: null,
    });
    return;
  }

  const url = `/uploads/${req.file.filename}`;
  const info = db
    .prepare('INSERT INTO media_files (file_name, original_name, mime_type, size_bytes, url) VALUES (?, ?, ?, ?, ?)')
    .run(req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, url);
  recordAuditLog(req.user!.email, 'UPLOAD', 'MediaFile', Number(info.lastInsertRowid), req.file.originalname);
  res.status(201).json({
    success: true,
    message: 'File uploaded.',
    data: {
      id: Number(info.lastInsertRowid),
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      url,
    },
  });
});

adminRouter.post('/products/upload-pdf', uploadPrivatePdf.single('file'), (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'Please attach a valid PDF file.', data: null });
    return;
  }

  if (!verifyFileMagicBytes(req.file.path, 'application/pdf')) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    recordSecurityEvent({
      level: 'WARN',
      eventType: 'PRIVATE_PDF_REJECTED',
      ip: req.ip,
      userEmail: req.user?.email,
      method: req.method,
      path: req.originalUrl,
      message: `Rejected invalid PDF upload (${req.file.originalname}): missing %PDF- signature.`,
    });
    res.status(400).json({
      success: false,
      message: 'Uploaded file is not a valid PDF document (failed %PDF- magic-byte check).',
      data: null,
    });
    return;
  }

  const pdfRef = `private-books/${req.file.filename}`;
  recordAuditLog(req.user!.email, 'UPLOAD', 'PrivatePdfBook', null, `${req.file.originalname} -> ${pdfRef}`);
  res.status(201).json({
    success: true,
    message: 'PDF stored securely in private book storage.',
    data: {
      fileName: req.file.filename,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      pdfUrl: pdfRef,
    },
  });
});

adminRouter.delete('/media/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT file_name FROM media_files WHERE id = ?').get(id) as { file_name: string } | undefined;
  if (row) {
    const filePath = path.join(uploadsDir, row.file_name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM media_files WHERE id = ?').run(id);
    recordAuditLog(req.user!.email, 'DELETE', 'MediaFile', id, row.file_name);
  }
  res.json({ success: true, message: 'Media deleted.', data: null });
});

adminRouter.get('/audit-logs', (_req, res) => {
  const rows = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100').all() as Record<string, unknown>[];
  res.json({
    success: true,
    data: rows.map((l) => ({
      id: l.id,
      userEmail: l.user_email,
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      details: l.details,
      createdAt: l.created_at,
    })),
  });
});

// --- Products & Orders Admin CRUD ---

const adminProductSchema = z.object({
  title: z.string().min(2).max(200),
  slug: z.string().max(220).optional(),
  category: z.string().min(2).max(80),
  shortDescription: z.string().min(5).max(500),
  fullDescription: z.string().min(5).max(8000),
  priceUsd: z.number().min(0),
  priceNpr: z.number().min(0),
  compareAtUsd: z.number().min(0).nullable().optional(),
  sku: z.string().min(2).max(60),
  inventoryCount: z.number().int().min(0).default(100),
  isDigital: z.boolean().default(true),
  imageUrl: z.string().max(500).nullable().optional(),
  pdfUrl: z.string().max(500).nullable().optional(),
  deliveryInfo: z.string().max(400).default('Instant digital download link sent via email upon confirmation.'),
  features: z.array(z.string().min(1).max(200)).default([]),
  featured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

adminRouter.get('/products', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM products WHERE is_deleted = 0 ORDER BY display_order ASC, id DESC')
    .all() as Record<string, unknown>[];

  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      title: String(r.title),
      slug: String(r.slug),
      category: String(r.category),
      shortDescription: String(r.short_description),
      fullDescription: String(r.full_description),
      priceUsd: Number(r.price_usd || 0),
      priceNpr: Number(r.price_npr || 0),
      compareAtUsd: r.compare_at_usd != null ? Number(r.compare_at_usd) : null,
      sku: String(r.sku),
      inventoryCount: Number(r.inventory_count ?? 0),
      isDigital: Boolean(r.is_digital),
      imageUrl: r.image_url ? String(r.image_url) : null,
      pdfUrl: r.pdf_url ? String(r.pdf_url) : null,
      hasPdf: Boolean(r.pdf_url),
      deliveryInfo: String(r.delivery_info || ''),
      features: JSON.parse(String(r.features_json || '[]')),
      featured: Boolean(r.featured),
      isActive: Boolean(r.is_active),
      displayOrder: Number(r.display_order || 0),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    })),
  });
});

adminRouter.post('/products', (req: AuthenticatedRequest, res) => {
  const parsed = adminProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid product payload.', data: null });
    return;
  }
  const d = parsed.data;
  const slug = ensureUniqueSlug('products', d.slug || d.title);
  const info = db
    .prepare(`
      INSERT INTO products (
        title, slug, category, short_description, full_description,
        price_usd, price_npr, compare_at_usd, sku, inventory_count,
        is_digital, image_url, pdf_url, delivery_info, features_json, featured, is_active, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      d.title,
      slug,
      d.category,
      d.shortDescription,
      d.fullDescription,
      d.priceUsd,
      d.priceNpr,
      d.compareAtUsd ?? null,
      d.sku,
      d.inventoryCount,
      d.isDigital ? 1 : 0,
      d.imageUrl || null,
      d.pdfUrl || null,
      d.deliveryInfo,
      JSON.stringify(d.features),
      d.featured ? 1 : 0,
      d.isActive ? 1 : 0,
      d.displayOrder
    );
  const id = Number(info.lastInsertRowid);
  recordAuditLog(req.user!.email, 'CREATE', 'Product', id, d.title);
  res.status(201).json({ success: true, message: 'Product created.', data: { id, slug } });
});

adminRouter.put('/products/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = adminProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid product payload.', data: null });
    return;
  }
  const d = parsed.data;
  const slug = ensureUniqueSlug('products', d.slug || d.title, id);
  db.prepare(`
    UPDATE products SET
      title = ?, slug = ?, category = ?, short_description = ?, full_description = ?,
      price_usd = ?, price_npr = ?, compare_at_usd = ?, sku = ?, inventory_count = ?,
      is_digital = ?, image_url = ?, pdf_url = ?, delivery_info = ?, features_json = ?,
      featured = ?, is_active = ?, display_order = ?, updated_at = datetime('now')
    WHERE id = ? AND is_deleted = 0
  `).run(
    d.title,
    slug,
    d.category,
    d.shortDescription,
    d.fullDescription,
    d.priceUsd,
    d.priceNpr,
    d.compareAtUsd ?? null,
    d.sku,
    d.inventoryCount,
    d.isDigital ? 1 : 0,
    d.imageUrl || null,
    d.pdfUrl || null,
    d.deliveryInfo,
    JSON.stringify(d.features),
    d.featured ? 1 : 0,
    d.isActive ? 1 : 0,
    d.displayOrder,
    id
  );
  recordAuditLog(req.user!.email, 'UPDATE', 'Product', id, d.title);
  res.json({ success: true, message: 'Product updated.', data: { id, slug } });
});

adminRouter.delete('/products/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE products SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?").run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'Product', id, 'Soft-deleted product');
  res.json({ success: true, message: 'Product removed.', data: null });
});

adminRouter.get('/orders', (_req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY id DESC').all() as Record<string, unknown>[];
  res.json({
    success: true,
    data: rows.map((r) => ({
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
    })),
  });
});

adminRouter.patch('/orders/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const status = req.body?.status;
  if (!['pending', 'paid', 'fulfilled', 'cancelled'].includes(status)) {
    res.status(400).json({ success: false, message: 'Invalid order status.', data: null });
    return;
  }
  db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  recordAuditLog(req.user!.email, 'UPDATE', 'Order', id, `Status updated to ${status}`);
  res.json({ success: true, message: 'Order status updated.', data: { id, status } });
});

adminRouter.delete('/orders/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM orders WHERE id = ?').run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'Order', id, 'Deleted order record');
  res.json({ success: true, message: 'Order removed.', data: null });
});

adminRouter.get('/email-logs', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM email_logs ORDER BY id DESC LIMIT 100')
    .all() as Record<string, unknown>[];

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

adminRouter.delete('/reviews/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM product_reviews WHERE id = ?').run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'ProductReview', id, 'Removed product review');
  res.json({ success: true, message: 'Product review removed.', data: null });
});

// --- Security Posture, Logs & SQLite Backup Strategy ---

adminRouter.get('/security/status', (req, res) => {
  const logs = db
    .prepare('SELECT * FROM security_logs ORDER BY id DESC LIMIT 40')
    .all() as Record<string, unknown>[];
  const backups = listDatabaseBackups();

  res.json({
    success: true,
    data: {
      controls: {
        roleBasedAccess: true,
        antiForgeryCsrf: true,
        privatePdfStorage: true,
        magicByteUploadValidation: true,
        idempotentPaymentProcessing: true,
        serverSidePriceValidation: true,
        rateLimitingAndLockout: true,
        parameterizedSql: true,
        httpOnlyRefreshCookies: true,
        automatedDailyBackups: true,
        httpsTransportSecurity:
          Boolean(req.secure) || String(req.get('x-forwarded-proto') || '').includes('https'),
      },
      backups,
      securityLogs: logs.map((l) => ({
        id: Number(l.id),
        level: String(l.level),
        eventType: String(l.event_type),
        ipAddress: l.ip_address ? String(l.ip_address) : null,
        userEmail: l.user_email ? String(l.user_email) : null,
        method: l.method ? String(l.method) : null,
        path: l.path ? String(l.path) : null,
        message: String(l.message),
        createdAt: String(l.created_at),
      })),
    },
  });
});

adminRouter.post('/security/backup', async (req: AuthenticatedRequest, res) => {
  const backup = await createDatabaseBackup(req.user!.email);
  recordAuditLog(req.user!.email, 'BACKUP', 'Database', null, backup.fileName);
  res.status(201).json({
    success: true,
    message: `Database backup created: ${backup.fileName}`,
    data: {
      backup,
      backups: listDatabaseBackups(),
    },
  });
});

adminRouter.get('/security/backups/:fileName', (req: AuthenticatedRequest, res) => {
  const fileName = path.basename(String(req.params.fileName || '').trim());
  if (!/^[a-zA-Z0-9._-]+\.db$/.test(fileName)) {
    res.status(400).json({ success: false, message: 'Invalid backup filename.', data: null });
    return;
  }
  const target = path.resolve(BACKUPS_DIR, fileName);
  if (!target.startsWith(BACKUPS_DIR + path.sep) || !fs.existsSync(target)) {
    res.status(404).json({ success: false, message: 'Backup snapshot not found.', data: null });
    return;
  }
  recordAuditLog(req.user!.email, 'DOWNLOAD', 'DatabaseBackup', null, fileName);
  res.download(target, fileName);
});

// --- Analytics Dashboard Aggregation ---

adminRouter.get('/analytics', (_req, res) => {
  const count = (sql: string) => (db.prepare(sql).get() as { cnt: number }).cnt;
  const sum = (sql: string) => (db.prepare(sql).get() as { total: number | null }).total || 0;

  const totalPageViews = count("SELECT COUNT(*) as cnt FROM analytics_events WHERE event_type = 'page_view'");
  const uniqueVisitors = count("SELECT COUNT(DISTINCT visitor_id) as cnt FROM analytics_events");
  const visitorsLast30d = count(
    "SELECT COUNT(DISTINCT visitor_id) as cnt FROM analytics_events WHERE created_at >= datetime('now', '-30 days')"
  );
  const totalProductViews = count("SELECT COUNT(*) as cnt FROM analytics_events WHERE event_type = 'product_view'");
  const totalArticleViews = count("SELECT COUNT(*) as cnt FROM analytics_events WHERE event_type = 'article_view'");

  const totalOrders = count("SELECT COUNT(*) as cnt FROM orders WHERE status != 'cancelled'");
  const paidOrders = count("SELECT COUNT(*) as cnt FROM orders WHERE status IN ('paid', 'fulfilled')");
  const totalRevenueUsd = sum(
    "SELECT SUM(total_amount) as total FROM orders WHERE currency = 'USD' AND status IN ('paid', 'fulfilled')"
  );
  const totalRevenueNpr = sum(
    "SELECT SUM(total_amount) as total FROM orders WHERE currency = 'NPR' AND status IN ('paid', 'fulfilled')"
  );
  const newsletterCount = count("SELECT COUNT(*) as cnt FROM newsletter_subscribers WHERE status = 'active'");
  const openChatsCount = count("SELECT COUNT(*) as cnt FROM chat_conversations WHERE status = 'open'");
  const unreadChatMessagesCount = sum('SELECT SUM(unread_admin_count) as total FROM chat_conversations');

  const dailyTrafficRows = db
    .prepare(`
      SELECT substr(created_at, 1, 10) AS day,
             COUNT(*) AS views,
             COUNT(DISTINCT visitor_id) AS visitors
      FROM analytics_events
      WHERE event_type = 'page_view' AND created_at >= datetime('now', '-30 days')
      GROUP BY day
      ORDER BY day ASC
    `)
    .all() as { day: string; views: number; visitors: number }[];

  const dailyOrdersRows = db
    .prepare(`
      SELECT substr(created_at, 1, 10) AS day,
             COUNT(*) AS orders_count
      FROM orders
      WHERE status != 'cancelled' AND created_at >= datetime('now', '-30 days')
      GROUP BY day
    `)
    .all() as { day: string; orders_count: number }[];

  const trafficMap = new Map(dailyTrafficRows.map((r) => [r.day, r]));
  const ordersDayMap = new Map(dailyOrdersRows.map((r) => [r.day, Number(r.orders_count || 0)]));
  const dailyTraffic: { day: string; views: number; visitors: number; ordersCount: number }[] = [];
  for (let offset = 29; offset >= 0; offset--) {
    const dt = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    const key = dt.toISOString().slice(0, 10);
    const t = trafficMap.get(key);
    dailyTraffic.push({
      day: key,
      views: t ? Number(t.views) : 0,
      visitors: t ? Number(t.visitors) : 0,
      ordersCount: ordersDayMap.get(key) || 0,
    });
  }

  const monthlyRevenueRows = db
    .prepare(`
      SELECT substr(created_at, 1, 7) AS month,
             COUNT(*) AS orders_count,
             SUM(CASE WHEN currency = 'USD' AND status IN ('paid', 'fulfilled') THEN total_amount ELSE 0 END) AS revenue_usd,
             SUM(CASE WHEN currency = 'NPR' AND status IN ('paid', 'fulfilled') THEN total_amount ELSE 0 END) AS revenue_npr
      FROM orders
      WHERE status != 'cancelled'
      GROUP BY month
      ORDER BY month ASC
      LIMIT 12
    `)
    .all() as { month: string; orders_count: number; revenue_usd: number; revenue_npr: number }[];

  const paymentMethodBreakdown = db
    .prepare(`
      SELECT payment_method AS method,
             COUNT(*) AS count,
             SUM(CASE WHEN currency = 'NPR' THEN total_amount ELSE 0 END) AS revenue_npr,
             SUM(CASE WHEN currency = 'USD' THEN total_amount ELSE 0 END) AS revenue_usd
      FROM orders
      WHERE status != 'cancelled'
      GROUP BY payment_method
      ORDER BY count DESC
    `)
    .all() as { method: string; count: number; revenue_npr: number; revenue_usd: number }[];

  const orderStatusBreakdown = db
    .prepare(`
      SELECT status,
             COUNT(*) AS count
      FROM orders
      GROUP BY status
      ORDER BY count DESC
    `)
    .all() as { status: string; count: number }[];

  const totalAttendanceRows = count('SELECT COUNT(*) as cnt FROM student_attendance');
  const presentAttendanceRows = count(
    "SELECT COUNT(*) as cnt FROM student_attendance WHERE status IN ('present', 'late')"
  );

  const academyEngagement = {
    classesCount: count('SELECT COUNT(*) as cnt FROM school_classes WHERE is_active = 1'),
    studentsCount: count("SELECT COUNT(*) as cnt FROM students WHERE status = 'active'"),
    videosCount: count('SELECT COUNT(*) as cnt FROM class_videos WHERE is_published = 1'),
    videoViewsCount: sum('SELECT SUM(views_count) as total FROM class_videos'),
    liveClassesCount: count("SELECT COUNT(*) as cnt FROM online_classes WHERE status = 'live'"),
    attendancePresentRate:
      totalAttendanceRows > 0 ? Math.round((presentAttendanceRows / totalAttendanceRows) * 100) : 100,
  };

  const communicationSummary = {
    totalConversations: count('SELECT COUNT(*) as cnt FROM chat_conversations'),
    openChatsCount,
    totalMessages: count('SELECT COUNT(*) as cnt FROM chat_messages'),
    voiceMessagesCount: count("SELECT COUNT(*) as cnt FROM chat_messages WHERE message_type = 'voice'"),
    totalCalls: count('SELECT COUNT(*) as cnt FROM call_logs'),
    videoCallsCount: count("SELECT COUNT(*) as cnt FROM call_logs WHERE call_type = 'video'"),
    audioCallsCount: count("SELECT COUNT(*) as cnt FROM call_logs WHERE call_type = 'audio'"),
  };

  const topProductRows = db
    .prepare(`
      SELECT p.id, p.title, p.slug, p.category, p.price_usd, p.price_npr,
             COUNT(ae.id) AS views
      FROM products p
      LEFT JOIN analytics_events ae ON ae.entity_id = p.id AND ae.event_type = 'product_view'
      WHERE p.is_deleted = 0
      GROUP BY p.id
      ORDER BY views DESC, p.id ASC
      LIMIT 8
    `)
    .all() as {
    id: number;
    title: string;
    slug: string;
    category: string;
    price_usd: number;
    price_npr: number;
    views: number;
  }[];

  const popularArticleRows = db
    .prepare(`
      SELECT bp.id, bp.title, bp.slug, bc.name AS category_name,
             COUNT(DISTINCT ae.id) AS views,
             COUNT(DISTINCT bm.id) AS comments_count
      FROM blog_posts bp
      JOIN blog_categories bc ON bc.id = bp.category_id
      LEFT JOIN analytics_events ae ON ae.entity_id = bp.id AND ae.event_type = 'article_view'
      LEFT JOIN blog_comments bm ON bm.post_id = bp.id AND bm.is_approved = 1
      WHERE bp.is_deleted = 0 AND bp.published = 1
      GROUP BY bp.id
      ORDER BY views DESC, comments_count DESC, bp.id ASC
      LIMIT 8
    `)
    .all() as {
    id: number;
    title: string;
    slug: string;
    category_name: string;
    views: number;
    comments_count: number;
  }[];

  res.json({
    success: true,
    data: {
      summary: {
        totalPageViews,
        uniqueVisitors,
        visitorsLast30d,
        totalProductViews,
        totalArticleViews,
        totalOrders,
        paidOrders,
        totalRevenueUsd: Math.round(totalRevenueUsd * 100) / 100,
        totalRevenueNpr: Math.round(totalRevenueNpr),
        newsletterCount,
        openChatsCount,
        unreadChatMessagesCount,
      },
      dailyTraffic,
      monthlyRevenue: monthlyRevenueRows.map((m) => ({
        month: m.month,
        ordersCount: Number(m.orders_count || 0),
        revenueUsd: Math.round(Number(m.revenue_usd || 0) * 100) / 100,
        revenueNpr: Math.round(Number(m.revenue_npr || 0)),
      })),
      paymentMethodBreakdown: paymentMethodBreakdown.map((pm) => ({
        method: String(pm.method || 'other'),
        count: Number(pm.count || 0),
        revenueNpr: Math.round(Number(pm.revenue_npr || 0)),
        revenueUsd: Math.round(Number(pm.revenue_usd || 0) * 100) / 100,
      })),
      orderStatusBreakdown: orderStatusBreakdown.map((os) => ({
        status: String(os.status),
        count: Number(os.count || 0),
      })),
      academyEngagement,
      communicationSummary,
      topProducts: topProductRows.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category,
        priceUsd: Number(p.price_usd),
        priceNpr: Number(p.price_npr),
        views: Number(p.views || 0),
      })),
      popularArticles: popularArticleRows.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        categoryName: a.category_name,
        views: Number(a.views || 0),
        commentsCount: Number(a.comments_count || 0),
      })),
    },
  });
});

// --- Admin Live Support Chat Inbox ---

adminRouter.get('/chat/conversations', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT cc.*,
             (SELECT message FROM chat_messages cm WHERE cm.conversation_id = cc.id ORDER BY cm.id DESC LIMIT 1) AS last_message
      FROM chat_conversations cc
      ORDER BY cc.unread_admin_count DESC, cc.last_message_at DESC, cc.id DESC
    `)
    .all() as Record<string, unknown>[];

  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      sessionToken: String(r.session_token),
      visitorName: String(r.visitor_name),
      visitorEmail: r.visitor_email ? String(r.visitor_email) : null,
      status: String(r.status) as 'open' | 'closed',
      unreadAdminCount: Number(r.unread_admin_count || 0),
      lastMessage: r.last_message ? String(r.last_message) : '',
      lastMessageAt: String(r.last_message_at),
      createdAt: String(r.created_at),
    })),
  });
});

adminRouter.get('/chat/conversations/:id/messages', (req, res) => {
  const id = Number(req.params.id);
  const conv = db.prepare('SELECT * FROM chat_conversations WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!conv) {
    res.status(404).json({ success: false, message: 'Conversation not found.', data: null });
    return;
  }

  db.prepare('UPDATE chat_conversations SET unread_admin_count = 0 WHERE id = ?').run(id);
  const messages = db
    .prepare('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY id ASC')
    .all(id) as Record<string, unknown>[];

  res.json({
    success: true,
    data: {
      conversation: {
        id: Number(conv.id),
        sessionToken: String(conv.session_token),
        visitorName: String(conv.visitor_name),
        visitorEmail: conv.visitor_email ? String(conv.visitor_email) : null,
        status: String(conv.status) as 'open' | 'closed',
        unreadAdminCount: 0,
        lastMessageAt: String(conv.last_message_at),
        createdAt: String(conv.created_at),
      },
      messages: messages.map((m) => ({
        id: Number(m.id),
        conversationId: Number(m.conversation_id),
        senderRole: String(m.sender_role) as 'visitor' | 'admin',
        senderName: String(m.sender_name),
        message: String(m.message),
        messageType: String(m.message_type || 'text') as 'text' | 'voice' | 'call_log',
        mediaUrl: m.media_url ? String(m.media_url) : null,
        mediaDurationSec: m.media_duration_sec != null ? Number(m.media_duration_sec) : null,
        createdAt: String(m.created_at),
      })),
    },
  });
});

adminRouter.post('/chat/conversations/:id/reply', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const messageText = typeof req.body?.message === 'string' ? req.body.message.replace(/[<>]/g, '').trim() : '';
  if (!messageText || messageText.length > 2000) {
    res.status(400).json({ success: false, message: 'Reply message is required (1-2000 chars).', data: null });
    return;
  }

  const conv = db.prepare('SELECT * FROM chat_conversations WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!conv) {
    res.status(404).json({ success: false, message: 'Conversation not found.', data: null });
    return;
  }

  const senderName = req.user?.fullName || 'Pramesh Bhattarai';
  const info = db
    .prepare(
      "INSERT INTO chat_messages (conversation_id, sender_role, sender_name, message, message_type) VALUES (?, 'admin', ?, ?, 'text')"
    )
    .run(id, senderName, messageText);
  db.prepare("UPDATE chat_conversations SET unread_admin_count = 0, last_message_at = datetime('now') WHERE id = ?").run(
    id
  );

  const row = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(Number(info.lastInsertRowid)) as Record<
    string,
    unknown
  >;
  const mappedMsg = {
    id: Number(row.id),
    conversationId: id,
    senderRole: 'admin' as const,
    senderName: String(row.sender_name),
    message: String(row.message),
    messageType: 'text' as const,
    mediaUrl: null,
    mediaDurationSec: null,
    createdAt: String(row.created_at),
  };

  const sessionToken = String(conv.session_token);
  const wsPayload = {
    type: 'chat:message' as const,
    conversationId: id,
    sessionToken,
    visitorName: String(conv.visitor_name),
    message: mappedMsg,
  };

  broadcastToConversation(sessionToken, wsPayload);
  broadcastToAdmins(wsPayload);

  res.status(201).json({ success: true, data: mappedMsg });
});

adminRouter.post(
  '/chat/conversations/:id/voice',
  uploadVoiceNote.single('audio'),
  (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Voice recording file is required.', data: null });
      return;
    }

    const mime = (req.file.mimetype || 'audio/webm').split(';')[0].trim().toLowerCase();
    if (!verifyFileMagicBytes(req.file.path, mime)) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, message: 'Invalid audio file signature.', data: null });
      return;
    }

    const conv = db.prepare('SELECT * FROM chat_conversations WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!conv) {
      fs.unlinkSync(req.file.path);
      res.status(404).json({ success: false, message: 'Conversation not found.', data: null });
      return;
    }

    const durationSec = Math.max(1, Math.min(600, Math.round(Number(req.body?.durationSec || 0))));
    const mediaUrl = `/api/v1/chat/voice/${req.file.filename}`;
    const senderName = req.user?.fullName || 'Pramesh Bhattarai';

    const info = db
      .prepare(
        "INSERT INTO chat_messages (conversation_id, sender_role, sender_name, message, message_type, media_url, media_duration_sec) VALUES (?, 'admin', ?, ?, 'voice', ?, ?)"
      )
      .run(id, senderName, `Voice message (${durationSec}s)`, mediaUrl, durationSec);

    db.prepare("UPDATE chat_conversations SET unread_admin_count = 0, last_message_at = datetime('now') WHERE id = ?").run(
      id
    );

    const row = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(Number(info.lastInsertRowid)) as Record<
      string,
      unknown
    >;
    const mappedMsg = {
      id: Number(row.id),
      conversationId: id,
      senderRole: 'admin' as const,
      senderName: String(row.sender_name),
      message: String(row.message),
      messageType: 'voice' as const,
      mediaUrl,
      mediaDurationSec: durationSec,
      createdAt: String(row.created_at),
    };

    const sessionToken = String(conv.session_token);
    const wsPayload = {
      type: 'chat:message' as const,
      conversationId: id,
      sessionToken,
      visitorName: String(conv.visitor_name),
      message: mappedMsg,
    };

    broadcastToConversation(sessionToken, wsPayload);
    broadcastToAdmins(wsPayload);

    res.status(201).json({ success: true, data: mappedMsg });
  }
);

adminRouter.get('/chat/calls', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT cl.*, cc.visitor_name
       FROM call_logs cl
       LEFT JOIN chat_conversations cc ON cc.id = cl.conversation_id
       ORDER BY cl.id DESC
       LIMIT 30`
    )
    .all() as Record<string, unknown>[];

  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      conversationId: r.conversation_id != null ? Number(r.conversation_id) : null,
      classSessionId: r.class_session_id != null ? Number(r.class_session_id) : null,
      visitorName: r.visitor_name ? String(r.visitor_name) : null,
      callType: String(r.call_type) as 'audio' | 'video',
      initiatedByRole: String(r.initiated_by_role),
      initiatedByName: String(r.initiated_by_name),
      status: String(r.status),
      durationSeconds: Number(r.duration_seconds || 0),
      startedAt: String(r.started_at),
      endedAt: r.ended_at ? String(r.ended_at) : null,
    })),
  });
});

adminRouter.patch('/chat/conversations/:id', (req, res) => {
  const id = Number(req.params.id);
  const status = req.body?.status;
  if (status !== 'open' && status !== 'closed') {
    res.status(400).json({ success: false, message: 'Status must be open or closed.', data: null });
    return;
  }
  const conv = db.prepare('SELECT session_token FROM chat_conversations WHERE id = ?').get(id) as
    | { session_token: string }
    | undefined;
  if (!conv) {
    res.status(404).json({ success: false, message: 'Conversation not found.', data: null });
    return;
  }
  db.prepare('UPDATE chat_conversations SET status = ? WHERE id = ?').run(status, id);
  broadcastToConversation(conv.session_token, {
    type: 'chat:status',
    conversationId: id,
    status,
  });
  res.json({ success: true, message: `Conversation marked ${status}.`, data: { id, status } });
});

// --- Newsletter & Blog Comments Moderation ---

adminRouter.get('/newsletter', (_req, res) => {
  const rows = db.prepare('SELECT * FROM newsletter_subscribers ORDER BY id DESC').all() as Record<string, unknown>[];
  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      email: String(r.email),
      name: r.name ? String(r.name) : null,
      status: String(r.status),
      createdAt: String(r.created_at),
    })),
  });
});

adminRouter.delete('/newsletter/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM newsletter_subscribers WHERE id = ?').run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'NewsletterSubscriber', id, 'Removed subscriber');
  res.json({ success: true, message: 'Subscriber removed.', data: null });
});

adminRouter.get('/blog/comments', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT bc.*, bp.title AS post_title, bp.slug AS post_slug
      FROM blog_comments bc
      JOIN blog_posts bp ON bp.id = bc.post_id
      ORDER BY bc.id DESC
    `)
    .all() as Record<string, unknown>[];

  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      postId: Number(r.post_id),
      postTitle: String(r.post_title),
      postSlug: String(r.post_slug),
      authorName: String(r.author_name),
      authorEmail: String(r.author_email),
      comment: String(r.comment),
      createdAt: String(r.created_at),
    })),
  });
});

adminRouter.delete('/blog/comments/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM blog_comments WHERE id = ?').run(id);
  recordAuditLog(req.user!.email, 'DELETE', 'BlogComment', id, 'Moderated blog comment');
  res.json({ success: true, message: 'Comment deleted.', data: null });
});




