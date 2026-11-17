import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';
import { recordSecurityEvent } from './security.ts';

const ACCESS_SECRET = process.env.JWT_SECRET || 'dev-only-access-secret-replace-in-production-64chars-minimum';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-secret-replace-in-production-64chars-minimum';
const ACCESS_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TTL_DAYS = 7;

export interface JwtUserPayload {
  sub: number;
  email: string;
  fullName: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtUserPayload;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function issueAccessToken(user: JwtUserPayload): string {
  return jwt.sign(user, ACCESS_SECRET, { expiresIn: ACCESS_TTL_SECONDS });
}

export function issueRefreshToken(userId: number): { token: string; expiresAt: string } {
  const raw = crypto.randomBytes(48).toString('hex');
  const signed = jwt.sign({ sub: userId, jti: raw }, REFRESH_SECRET, {
    expiresIn: `${REFRESH_TTL_DAYS}d`,
  });
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
  ).run(userId, hashToken(signed), expiresAt);

  return { token: signed, expiresAt };
}

export function rotateRefreshToken(oldToken: string): {
  user: JwtUserPayload;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
} | null {
  try {
    const decoded = jwt.verify(oldToken, REFRESH_SECRET) as unknown as { sub: number };
    const oldHash = hashToken(oldToken);
    const stored = db
      .prepare('SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = ?')
      .get(oldHash) as { id: number; user_id: number; expires_at: string; revoked_at: string | null } | undefined;

    if (!stored || stored.revoked_at) {
      // Reuse detection: revoke all active tokens for user
      if (decoded?.sub) {
        db.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL").run(
          decoded.sub
        );
        recordSecurityEvent({
          level: 'ERROR',
          eventType: 'REFRESH_TOKEN_REUSE',
          message: `Detected refresh token reuse for userId=${decoded.sub}; revoked all active sessions.`,
        });
      }
      return null;
    }

    if (new Date(stored.expires_at).getTime() <= Date.now()) {
      return null;
    }

    const userRow = db
      .prepare('SELECT id, email, full_name, role FROM users WHERE id = ?')
      .get(stored.user_id) as { id: number; email: string; full_name: string; role: string } | undefined;

    if (!userRow) return null;

    const payload: JwtUserPayload = {
      sub: userRow.id,
      email: userRow.email,
      fullName: userRow.full_name,
      role: userRow.role,
    };

    const nextAccess = issueAccessToken(payload);
    const nextRefresh = issueRefreshToken(userRow.id);

    db.prepare(
      "UPDATE refresh_tokens SET revoked_at = datetime('now'), replaced_by_token_hash = ? WHERE id = ?"
    ).run(hashToken(nextRefresh.token), stored.id);

    return {
      user: payload,
      accessToken: nextAccess,
      refreshToken: nextRefresh.token,
      expiresInSeconds: ACCESS_TTL_SECONDS,
    };
  } catch {
    return null;
  }
}

export function verifyAccessToken(token: string): JwtUserPayload | null {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as unknown as JwtUserPayload;
    return decoded?.email ? decoded : null;
  } catch {
    return null;
  }
}

export function tryGetAuthUser(req: Request): JwtUserPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return verifyAccessToken(authHeader.slice(7));
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    recordSecurityEvent({
      level: 'WARN',
      eventType: 'AUTH_MISSING_TOKEN',
      ip: req.ip,
      method: req.method,
      path: req.originalUrl,
      message: 'Unauthenticated request blocked by requireAuth.',
    });
    res.status(401).json({ success: false, message: 'Authentication required.', data: null });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as unknown as JwtUserPayload;
    if (!decoded || !decoded.email) {
      res.status(401).json({ success: false, message: 'Invalid authentication token.', data: null });
      return;
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.', data: null });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    recordSecurityEvent({
      level: 'WARN',
      eventType: 'ADMIN_AUTH_MISSING',
      ip: req.ip,
      method: req.method,
      path: req.originalUrl,
      message: 'Unauthenticated admin access attempt blocked.',
    });
    res.status(401).json({ success: false, message: 'Authentication required.', data: null });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as unknown as JwtUserPayload;
    if (!decoded || decoded.role !== 'Admin') {
      recordSecurityEvent({
        level: 'WARN',
        eventType: 'RBAC_ADMIN_DENIED',
        ip: req.ip,
        userEmail: decoded?.email || null,
        method: req.method,
        path: req.originalUrl,
        message: `Blocked non-admin role (${decoded?.role || 'unknown'}) from admin endpoint.`,
      });
      res.status(403).json({ success: false, message: 'Administrator role required.', data: null });
      return;
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.', data: null });
  }
}

export function recordAuditLog(
  userEmail: string,
  action: string,
  entityType: string,
  entityId?: string | number | null,
  details?: string | null
): void {
  db.prepare(
    'INSERT INTO audit_logs (user_email, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)'
  ).run(userEmail, action, entityType, entityId != null ? String(entityId) : null, details ?? null);
}
