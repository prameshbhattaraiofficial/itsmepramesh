import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';

export const PRIVATE_BOOKS_DIR = path.resolve(process.cwd(), 'storage', 'private-books');
export const PRIVATE_VIDEOS_DIR = path.resolve(process.cwd(), 'storage', 'videos');
export const PRIVATE_VOICE_DIR = path.resolve(process.cwd(), 'storage', 'voice-notes');
export const BACKUPS_DIR = path.resolve(process.cwd(), 'storage', 'backups');
export const PUBLIC_UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');

fs.mkdirSync(PRIVATE_BOOKS_DIR, { recursive: true });
fs.mkdirSync(PRIVATE_VIDEOS_DIR, { recursive: true });
fs.mkdirSync(PRIVATE_VOICE_DIR, { recursive: true });
fs.mkdirSync(BACKUPS_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });

export const CSRF_COOKIE_NAME = 'pb_csrf_token';
export const REFRESH_COOKIE_NAME = 'pb_refresh_token';

// --- Security Logging ---

export function recordSecurityEvent(params: {
  level?: 'INFO' | 'WARN' | 'ERROR';
  eventType: string;
  ip?: string | null;
  userEmail?: string | null;
  method?: string | null;
  path?: string | null;
  message: string;
}): void {
  try {
    db.prepare(
      `INSERT INTO security_logs (level, event_type, ip_address, user_email, method, path, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      params.level || 'WARN',
      params.eventType,
      params.ip ?? null,
      params.userEmail ?? null,
      params.method ?? null,
      params.path ?? null,
      params.message.slice(0, 1000)
    );
  } catch (err) {
    console.error('Failed to persist security log:', err);
  }
}

// --- Secure Cookie & Anti-Forgery (CSRF) Helpers ---

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      result[key] = decodeURIComponent(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

function isHttpsRequest(req: Request): boolean {
  const xfProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase();
  return req.secure || xfProto === 'https';
}

export function ensureCsrfCookie(req: Request, res: Response): string {
  const cookies = parseCookies(req);
  let token = cookies[CSRF_COOKIE_NAME];
  if (!token || token.length < 32) {
    token = crypto.randomBytes(32).toString('hex');
  }
  const secure = isHttpsRequest(req);
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Readable by SPA to echo in X-CSRF-Token header
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

export function setRefreshTokenCookie(req: Request, res: Response, refreshToken: string): void {
  const secure = isHttpsRequest(req);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  ensureCsrfCookie(req, res);
}

export function clearAuthCookies(req: Request, res: Response): void {
  const secure = isHttpsRequest(req);
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/api/v1/auth',
  });
}

function isSameOriginHeader(req: Request): boolean {
  const host = String(req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim().toLowerCase();
  if (!host) return true;
  const origin = req.get('origin');
  if (origin) {
    try {
      const u = new URL(origin);
      return u.host.toLowerCase() === host;
    } catch {
      return false;
    }
  }
  const referer = req.get('referer');
  if (referer) {
    try {
      const u = new URL(referer);
      return u.host.toLowerCase() === host;
    } catch {
      return false;
    }
  }
  return true;
}

export function verifyCsrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }

  // Enforce Origin/Referer check on browser requests
  if (!isSameOriginHeader(req)) {
    recordSecurityEvent({
      level: 'WARN',
      eventType: 'ORIGIN_MISMATCH',
      ip: req.ip,
      method: req.method,
      path: req.originalUrl,
      message: `Blocked cross-origin mutating request from origin=${req.get('origin') || 'none'}`,
    });
    res.status(403).json({
      success: false,
      message: 'Cross-origin request blocked by anti-forgery protection.',
      data: null,
    });
    return;
  }

  // Enforce Double-Submit CSRF token when CSRF cookie is present in browser session
  const cookies = parseCookies(req);
  const cookieToken = cookies[CSRF_COOKIE_NAME];
  if (cookieToken) {
    const headerToken = String(req.get('x-csrf-token') || '');
    const a = Buffer.from(cookieToken, 'utf8');
    const b = Buffer.from(headerToken, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      recordSecurityEvent({
        level: 'WARN',
        eventType: 'CSRF_INVALID',
        ip: req.ip,
        method: req.method,
        path: req.originalUrl,
        message: 'Anti-forgery X-CSRF-Token missing or mismatched.',
      });
      res.status(403).json({
        success: false,
        message: 'Invalid or missing anti-forgery (CSRF) token. Please refresh and try again.',
        data: null,
      });
      return;
    }
  }

  next();
}

// --- Sliding/Fixed Window Rate Limiting & Account Lockout ---

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function createRateLimiter(options: {
  keyPrefix: string;
  windowMs: number;
  max: number;
  message: string;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const ip = req.ip || 'unknown';
    const key = `${options.keyPrefix}:${ip}`;
    const existing = rateBuckets.get(key);

    if (existing && existing.resetAt > now) {
      if (existing.count >= options.max) {
        const retrySec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
        res.setHeader('Retry-After', String(retrySec));
        res.setHeader('X-RateLimit-Limit', String(options.max));
        res.setHeader('X-RateLimit-Remaining', '0');
        recordSecurityEvent({
          level: 'WARN',
          eventType: 'RATE_LIMIT_EXCEEDED',
          ip,
          method: req.method,
          path: req.originalUrl,
          message: `Rate limit exceeded on ${options.keyPrefix} (${existing.count}/${options.max})`,
        });
        res.status(429).json({ success: false, message: options.message, data: null });
        return;
      }
      existing.count += 1;
      res.setHeader('X-RateLimit-Limit', String(options.max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.max - existing.count)));
    } else {
      rateBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
      res.setHeader('X-RateLimit-Limit', String(options.max));
      res.setHeader('X-RateLimit-Remaining', String(options.max - 1));
    }
    next();
  };
}

const accountFailBuckets = new Map<string, { count: number; lockedUntil: number }>();
const MAX_FAILED_LOGINS = 7;
const LOCKOUT_MS = 15 * 60 * 1000;

export function checkAccountLockout(email: string): { locked: boolean; retryMinutes: number } {
  const key = email.trim().toLowerCase();
  const entry = accountFailBuckets.get(key);
  if (!entry) return { locked: false, retryMinutes: 0 };
  if (entry.lockedUntil > Date.now()) {
    return { locked: true, retryMinutes: Math.max(1, Math.ceil((entry.lockedUntil - Date.now()) / 60000)) };
  }
  if (entry.lockedUntil > 0 && entry.lockedUntil <= Date.now()) {
    accountFailBuckets.delete(key);
  }
  return { locked: false, retryMinutes: 0 };
}

export function recordFailedLoginAttempt(email: string, ip?: string | null): void {
  const key = email.trim().toLowerCase();
  const prev = accountFailBuckets.get(key);
  const nextCount = (prev?.count || 0) + 1;
  const lockedUntil = nextCount >= MAX_FAILED_LOGINS ? Date.now() + LOCKOUT_MS : 0;
  accountFailBuckets.set(key, { count: nextCount, lockedUntil });
  recordSecurityEvent({
    level: lockedUntil > 0 ? 'ERROR' : 'WARN',
    eventType: lockedUntil > 0 ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
    ip,
    userEmail: key,
    method: 'POST',
    path: '/api/v1/auth/login',
    message:
      lockedUntil > 0
        ? `Account temporarily locked for 15 minutes after ${nextCount} failed attempts.`
        : `Failed login attempt (${nextCount}/${MAX_FAILED_LOGINS}).`,
  });
}

export function clearFailedLoginAttempts(email: string): void {
  accountFailBuckets.delete(email.trim().toLowerCase());
}

// --- Magic-Byte File Verification & Private PDF Resolution ---

export function verifyFileMagicBytes(filePath: string, mimeType: string): boolean {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    if (bytesRead < 4) return false;

    if (mimeType === 'application/pdf') {
      return buf.subarray(0, 5).toString('ascii') === '%PDF-';
    }
    if (mimeType === 'image/jpeg') {
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    }
    if (mimeType === 'image/png') {
      return (
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47 &&
        buf[4] === 0x0d &&
        buf[5] === 0x0a &&
        buf[6] === 0x1a &&
        buf[7] === 0x0a
      );
    }
    if (mimeType === 'image/webp') {
      return (
        bytesRead >= 12 &&
        buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buf.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    }
    if (mimeType === 'video/mp4' || mimeType === 'video/quicktime' || mimeType === 'video/x-m4v') {
      // ISO Base Media container ('ftyp' at byte offset 4)
      return bytesRead >= 8 && buf.subarray(4, 8).toString('ascii') === 'ftyp';
    }
    if (mimeType === 'video/webm' || mimeType === 'video/x-matroska' || mimeType.startsWith('audio/webm')) {
      // EBML header: 1A 45 DF A3
      return buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
    }
    if (
      mimeType === 'video/ogg' ||
      mimeType === 'application/ogg' ||
      mimeType.startsWith('audio/ogg') ||
      mimeType.startsWith('audio/opus')
    ) {
      return buf.subarray(0, 4).toString('ascii') === 'OggS';
    }
    if (mimeType.startsWith('audio/mp4') || mimeType === 'audio/aac' || mimeType === 'audio/x-m4a') {
      return bytesRead >= 8 && buf.subarray(4, 8).toString('ascii') === 'ftyp';
    }
    if (mimeType === 'audio/wav' || mimeType === 'audio/wave' || mimeType === 'audio/x-wav') {
      return (
        bytesRead >= 12 &&
        buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buf.subarray(8, 12).toString('ascii') === 'WAVE'
      );
    }
    if (mimeType === 'audio/mpeg' || mimeType === 'audio/mp3') {
      return (
        buf.subarray(0, 3).toString('ascii') === 'ID3' ||
        (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)
      );
    }
    return false;
  } catch {
    return false;
  }
}

export function resolveVideoPath(fileName: string): string | null {
  const cleaned = path.basename(fileName.trim());
  if (!cleaned || cleaned.includes('..') || cleaned.includes('\0')) return null;
  const candidate = path.resolve(PRIVATE_VIDEOS_DIR, cleaned);
  if (candidate.startsWith(PRIVATE_VIDEOS_DIR + path.sep) && fs.existsSync(candidate)) {
    return candidate;
  }
  return null;
}

export function resolveVoicePath(fileName: string): string | null {
  const cleaned = path.basename(fileName.trim());
  if (!cleaned || cleaned.includes('..') || cleaned.includes('\0')) return null;
  const candidate = path.resolve(PRIVATE_VOICE_DIR, cleaned);
  if (candidate.startsWith(PRIVATE_VOICE_DIR + path.sep) && fs.existsSync(candidate)) {
    return candidate;
  }
  return null;
}

export function resolvePrivatePdfPath(storedRef: string): string | null {
  const cleaned = storedRef.trim().replace(/^\/+/, '');
  if (!cleaned || cleaned.includes('..') || cleaned.includes('\0')) return null;

  // Preferred private storage namespace: private-books/<filename>.pdf
  if (cleaned.startsWith('private-books/')) {
    const fileName = cleaned.slice('private-books/'.length);
    const candidate = path.resolve(PRIVATE_BOOKS_DIR, fileName);
    if (candidate.startsWith(PRIVATE_BOOKS_DIR + path.sep) && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Direct filename fallback inside PRIVATE_BOOKS_DIR
  const baseName = path.basename(cleaned);
  const directPrivate = path.resolve(PRIVATE_BOOKS_DIR, baseName);
  if (directPrivate.startsWith(PRIVATE_BOOKS_DIR + path.sep) && fs.existsSync(directPrivate)) {
    return directPrivate;
  }

  // Legacy uploads fallback (if an older upload was saved in public/uploads)
  if (cleaned.startsWith('uploads/')) {
    const uploadCandidate = path.resolve(PUBLIC_UPLOADS_DIR, cleaned.slice('uploads/'.length));
    if (uploadCandidate.startsWith(PUBLIC_UPLOADS_DIR + path.sep) && fs.existsSync(uploadCandidate)) {
      return uploadCandidate;
    }
  }

  return null;
}

// --- SQLite Database Backup Strategy ---

const MAX_BACKUPS_TO_KEEP = 14;

export interface BackupFileInfo {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

export function listDatabaseBackups(): BackupFileInfo[] {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const files = fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith('.db'))
    .map((fileName) => {
      const fullPath = path.join(BACKUPS_DIR, fileName);
      const stat = fs.statSync(fullPath);
      return {
        fileName,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return files;
}

export function cleanupOldBackups(): void {
  const backups = listDatabaseBackups();
  if (backups.length <= MAX_BACKUPS_TO_KEEP) return;
  for (const stale of backups.slice(MAX_BACKUPS_TO_KEEP)) {
    const p = path.join(BACKUPS_DIR, stale.fileName);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  }
}

export async function createDatabaseBackup(triggeredBy = 'system'): Promise<BackupFileInfo> {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `portfolio-backup-${stamp}.db`;
  const targetPath = path.resolve(BACKUPS_DIR, fileName);

  await db.backup(targetPath);
  cleanupOldBackups();

  const stat = fs.statSync(targetPath);
  recordSecurityEvent({
    level: 'INFO',
    eventType: 'DB_BACKUP_CREATED',
    userEmail: triggeredBy,
    message: `Created SQLite database snapshot ${fileName} (${stat.size} bytes).`,
  });

  return {
    fileName,
    sizeBytes: stat.size,
    createdAt: stat.mtime.toISOString(),
  };
}

let backupSchedulerStarted = false;
export function startScheduledBackups(): void {
  if (backupSchedulerStarted) return;
  backupSchedulerStarted = true;

  // Create an initial daily backup if none exists from today
  const existing = listDatabaseBackups();
  const todayPrefix = `portfolio-backup-${new Date().toISOString().slice(0, 10)}`;
  if (!existing.some((b) => b.fileName.startsWith(todayPrefix))) {
    createDatabaseBackup('auto-scheduler').catch((err) => {
      console.error('Initial scheduled backup error:', err);
    });
  }

  const DAY_MS = 24 * 60 * 60 * 1000;
  const timer = setInterval(() => {
    createDatabaseBackup('auto-scheduler').catch((err) => {
      console.error('Periodic scheduled backup error:', err);
    });
  }, DAY_MS);
  timer.unref();
}
