import { portfolioApi } from '@/src/services/api/portfolioApi';

const VISITOR_STORAGE_KEY = 'pb_visitor_id';
const CHAT_SESSION_STORAGE_KEY = 'pb_chat_session_token';

export function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
    const next =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `vis-${crypto.randomUUID()}`
        : `vis-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VISITOR_STORAGE_KEY, next);
    return next;
  } catch {
    return `vis-ephemeral-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function getOrCreateChatSessionToken(): string {
  try {
    const existing = localStorage.getItem(CHAT_SESSION_STORAGE_KEY);
    if (existing && existing.length >= 12) return existing;
    const next =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `chat-${crypto.randomUUID()}`
        : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(CHAT_SESSION_STORAGE_KEY, next);
    return next;
  } catch {
    return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function buildWebSocketUrl(params: Record<string, string>): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const search = new URLSearchParams(params).toString();
  return `${proto}//${window.location.host}/ws?${search}`;
}

export function trackAnalyticsSafe(payload: {
  eventType: 'page_view' | 'product_view' | 'article_view';
  path: string;
  entityId?: number;
}): void {
  try {
    const visitorId = getOrCreateVisitorId();
    const referrer = typeof document !== 'undefined' && document.referrer ? document.referrer : null;
    void portfolioApi
      .trackAnalyticsEvent({
        eventType: payload.eventType,
        path: payload.path,
        entityId: payload.entityId ?? null,
        visitorId,
        referrer,
      })
      .catch(() => undefined);
  } catch {
    // Non-blocking analytics
  }
}
