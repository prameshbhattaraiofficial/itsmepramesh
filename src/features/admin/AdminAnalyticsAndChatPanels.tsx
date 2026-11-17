import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Eye,
  FileText,
  GraduationCap,
  Mail,
  MessageSquare,
  Mic,
  Phone,
  Send,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Users,
  Video,
  Wallet,
} from 'lucide-react';
import { adminApi } from '@/src/services/api/adminApi';
import { getStoredTokens } from '@/src/services/api/httpClient';
import { buildWebSocketUrl } from '@/src/utils/analytics';
import {
  CallSessionModal,
  ChatMessageMedia,
  VoiceRecorderButton,
  formatSecondsClock,
  useWebRtcCallManager,
} from '@/src/components/common/RealtimeMediaTools';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Input';
import { Skeleton } from '@/src/components/ui/SwitchAndSkeleton';
import type { ChatMessageDto } from '@/src/types/portfolio';

const DONUT_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e'];

function DonutBreakdownCard({
  title,
  subtitle,
  items,
  emptyText,
}: {
  title: string;
  subtitle: string;
  items: { label: string; value: number; meta?: string }[];
  emptyText: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offsetAccum = 0;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-zinc-500">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-xs text-zinc-500 py-8 text-center">{emptyText}</p>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative h-32 w-32 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 110 110" className="h-32 w-32 -rotate-90" role="img" aria-label={title}>
                <circle
                  cx="55"
                  cy="55"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="14"
                  className="text-zinc-100 dark:text-zinc-800"
                />
                {items.map((item, idx) => {
                  const dashLen = (item.value / total) * circumference;
                  const seg = (
                    <circle
                      key={item.label}
                      cx="55"
                      cy="55"
                      r={radius}
                      fill="none"
                      stroke={DONUT_COLORS[idx % DONUT_COLORS.length]}
                      strokeWidth="14"
                      strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                      strokeDashoffset={-offsetAccum}
                      strokeLinecap="butt"
                    />
                  );
                  offsetAccum += dashLen;
                  return seg;
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-mono text-lg font-bold tabular-nums">{total}</span>
                <span className="text-[10px] text-zinc-500 uppercase">Total</span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-2.5 text-xs">
              {items.map((item, idx) => {
                const pct = Math.round((item.value / total) * 100);
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 font-medium text-zinc-800 dark:text-zinc-200 uppercase">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                        />
                        {item.label}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-zinc-500">
                        {item.value} ({pct}%){item.meta ? ` · ${item.meta}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminAnalyticsPanel() {
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(14);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const analyticsQuery = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: adminApi.getAnalytics,
    refetchInterval: 30000,
  });

  const data = analyticsQuery.data;

  const trafficSeries = useMemo(() => {
    const raw = data?.dailyTraffic || [];
    if (raw.length === 0) return [];
    return raw.slice(-rangeDays);
  }, [data?.dailyTraffic, rangeDays]);

  if (analyticsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-10 text-sm text-zinc-500">Unable to load analytics metrics.</CardContent>
      </Card>
    );
  }

  const maxDailyMetric = Math.max(
    4,
    ...trafficSeries.map((d) => Math.max(d.views, d.visitors))
  );
  const maxMonthlyRevenue = Math.max(1, ...data.monthlyRevenue.map((m) => m.revenueNpr + m.revenueUsd * 135));

  // Build SVG Area/Line coordinates
  const svgWidth = 680;
  const svgHeight = 220;
  const padX = 28;
  const padTop = 20;
  const padBottom = 28;
  const plotW = svgWidth - padX * 2;
  const plotH = svgHeight - padTop - padBottom;

  const getPointX = (idx: number) =>
    trafficSeries.length <= 1 ? padX + plotW / 2 : padX + (idx / (trafficSeries.length - 1)) * plotW;
  const getPointY = (val: number) => padTop + plotH - (val / maxDailyMetric) * plotH;

  const viewsPoints = trafficSeries.map((d, i) => ({ x: getPointX(i), y: getPointY(d.views), d }));
  const visitorsPoints = trafficSeries.map((d, i) => ({ x: getPointX(i), y: getPointY(d.visitors), d }));

  const viewsPolyline = viewsPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const visitorsPolyline = visitorsPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const viewsAreaPath =
    viewsPoints.length > 0
      ? `M ${viewsPoints[0].x} ${padTop + plotH} L ${viewsPoints.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${
          viewsPoints[viewsPoints.length - 1].x
        } ${padTop + plotH} Z`
      : '';

  const activeHover =
    hoveredIdx !== null && trafficSeries[hoveredIdx]
      ? trafficSeries[hoveredIdx]
      : trafficSeries[trafficSeries.length - 1];

  const conversionRate =
    data.summary.totalProductViews > 0
      ? Math.min(100, Math.round((data.summary.paidOrders / data.summary.totalProductViews) * 1000) / 10)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Site Analytics, Sales &amp; Communication Insights
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Interactive visitor &amp; page view trends, monthly revenue, payment split, academy attendance, and live call/voice metrics.
          </p>
        </div>

        <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#111114] p-1 text-xs w-fit">
          {([7, 14, 30] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => {
                setRangeDays(days);
                setHoveredIdx(null);
              }}
              className={`px-3 py-1 rounded-md font-mono font-medium transition-colors cursor-pointer ${
                rangeDays === days
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {days}D
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Website Visitors</span>
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums">{data.summary.uniqueVisitors}</p>
            <p className="mt-1 text-[11px] text-zinc-500 font-mono tabular-nums">
              {data.summary.totalPageViews} total views · {data.summary.visitorsLast30d} last 30d
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Product &amp; Article Views</span>
              <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums">{data.summary.totalProductViews}</p>
            <p className="mt-1 text-[11px] text-zinc-500 font-mono tabular-nums">
              {data.summary.totalArticleViews} article views · {conversionRate}% conv.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Paid Orders &amp; Sales</span>
              <ShoppingBag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums">{data.summary.paidOrders}</p>
            <p className="mt-1 text-[11px] text-zinc-500 font-mono tabular-nums">
              {data.summary.totalOrders} total orders placed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Revenue Confirmed</span>
              <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="mt-2 font-mono text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              NPR {data.summary.totalRevenueNpr.toLocaleString('en-US')}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500 font-mono tabular-nums">
              + ${data.summary.totalRevenueUsd.toFixed(2)} USD · {data.summary.newsletterCount} subscribers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Dual-Series Traffic Area Chart + Monthly Revenue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-base font-semibold">Visitor &amp; Page View Trend ({rangeDays} Days)</h2>
              </div>
              <p className="text-xs text-zinc-500">
                Hover any data point to inspect daily views, unique visitors, and orders.
              </p>
            </div>
            {activeHover ? (
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 font-mono text-[11px] tabular-nums">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{activeHover.day}</span>
                <span className="text-blue-600 dark:text-blue-400 ml-2">{activeHover.views} views</span>
                <span className="text-emerald-600 dark:text-emerald-400 ml-2">{activeHover.visitors} visitors</span>
                {typeof activeHover.ordersCount === 'number' ? (
                  <span className="text-amber-600 dark:text-amber-400 ml-2">{activeHover.ordersCount} orders</span>
                ) : null}
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {trafficSeries.length === 0 ? (
              <p className="text-xs text-zinc-500 py-10 text-center">No traffic logged yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="w-full overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-56 select-none"
                    role="img"
                    aria-label={`Visitor traffic chart for last ${rangeDays} days`}
                  >
                    <defs>
                      <linearGradient id="trafficViewsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.32" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                      const y = padTop + plotH * (1 - ratio);
                      const labelVal = Math.round(maxDailyMetric * ratio);
                      return (
                        <g key={ratio}>
                          <line
                            x1={padX}
                            y1={y}
                            x2={svgWidth - padX}
                            y2={y}
                            stroke="currentColor"
                            strokeOpacity="0.12"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={4}
                            y={y + 3}
                            fill="currentColor"
                            opacity="0.45"
                            fontSize="9"
                            fontFamily="monospace"
                          >
                            {labelVal}
                          </text>
                        </g>
                      );
                    })}

                    {/* Area & Curve */}
                    <path d={viewsAreaPath} fill="url(#trafficViewsFill)" />
                    <polyline
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={viewsPolyline}
                    />
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={visitorsPolyline}
                    />

                    {/* Interactive hover targets & dots */}
                    {viewsPoints.map((pt, idx) => {
                      const vPt = visitorsPoints[idx];
                      const isHovered = hoveredIdx === idx;
                      const showLabel =
                        trafficSeries.length <= 14 || idx % 4 === 0 || idx === trafficSeries.length - 1;
                      return (
                        <g
                          key={pt.d.day}
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onClick={() => setHoveredIdx(idx)}
                          className="cursor-pointer"
                        >
                          {isHovered ? (
                            <line
                              x1={pt.x}
                              y1={padTop}
                              x2={pt.x}
                              y2={padTop + plotH}
                              stroke="#2563eb"
                              strokeOpacity="0.35"
                              strokeWidth="1.5"
                            />
                          ) : null}
                          <rect
                            x={pt.x - plotW / Math.max(2, trafficSeries.length * 2)}
                            y={padTop}
                            width={plotW / Math.max(1, trafficSeries.length)}
                            height={plotH + padBottom}
                            fill="transparent"
                          />
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 5 : 3}
                            fill="#2563eb"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                          <circle
                            cx={vPt.x}
                            cy={vPt.y}
                            r={isHovered ? 4.5 : 2.5}
                            fill="#10b981"
                            stroke="#ffffff"
                            strokeWidth="1.2"
                          />
                          {showLabel ? (
                            <text
                              x={pt.x}
                              y={svgHeight - 6}
                              textAnchor="middle"
                              fill="currentColor"
                              opacity="0.55"
                              fontSize="9"
                              fontFamily="monospace"
                            >
                              {pt.d.day.slice(5)}
                            </text>
                          ) : null}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-zinc-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    Page Views
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Unique Visitors
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base font-semibold">Monthly Revenue &amp; Orders</h2>
            </div>
            <p className="text-xs text-zinc-500">Monthly completed &amp; active order volume.</p>
          </CardHeader>
          <CardContent>
            {data.monthlyRevenue.length === 0 ? (
              <p className="text-xs text-zinc-500 py-8 text-center">No orders recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {data.monthlyRevenue.map((m) => {
                  const normalizedScore = m.revenueNpr + m.revenueUsd * 135;
                  const widthPct = Math.max(6, Math.round((normalizedScore / maxMonthlyRevenue) * 100));
                  return (
                    <div key={m.month} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{m.month}</span>
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {m.ordersCount} orders · NPR {m.revenueNpr.toLocaleString('en-US')} / ${m.revenueUsd.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          style={{ width: `${widthPct}%` }}
                          className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distribution Donut Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DonutBreakdownCard
          title="Payment Method Distribution"
          subtitle="Share of orders grouped by checkout gateway (eSewa, Khalti, Card, Bank)."
          items={(data.paymentMethodBreakdown || []).map((pm) => ({
            label: pm.method.replace('_', ' '),
            value: pm.count,
            meta: pm.revenueNpr > 0 ? `NPR ${pm.revenueNpr.toLocaleString('en-US')}` : `$${pm.revenueUsd.toFixed(2)}`,
          }))}
          emptyText="No payment transactions logged yet."
        />

        <DonutBreakdownCard
          title="Order Fulfillment Status Split"
          subtitle="Lifecycle breakdown across paid, pending, processing, completed, and cancelled orders."
          items={(data.orderStatusBreakdown || []).map((st) => ({
            label: st.status,
            value: st.count,
          }))}
          emptyText="No orders available for status distribution."
        />
      </div>

      {/* Academy & Real-Time Communication Analytical Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold">Student Academy &amp; Class Engagement</h2>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <p className="text-zinc-500">Enrolled Students</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums">
                {data.academyEngagement?.studentsCount ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <p className="text-zinc-500">Active Classes</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums">
                {data.academyEngagement?.classesCount ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <p className="text-zinc-500">Live Sessions</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {data.academyEngagement?.liveClassesCount ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <p className="text-zinc-500">Uploaded Videos</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums">
                {data.academyEngagement?.videosCount ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <p className="text-zinc-500">Video Views</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {data.academyEngagement?.videoViewsCount ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <p className="text-zinc-500">Attendance Rate</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {data.academyEngagement?.attendancePresentRate ?? 0}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base font-semibold">Live Chat, Voice Notes &amp; Call Activity</h2>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <p className="text-zinc-500">Chat Threads</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums">
                {data.communicationSummary?.totalConversations ?? 0}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {data.communicationSummary?.openChatsCount ?? data.summary.openChatsCount} open
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <p className="text-zinc-500">Total Messages</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums">
                {data.communicationSummary?.totalMessages ?? 0}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {data.summary.unreadChatMessagesCount} unread
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <p className="text-zinc-500">Voice Recordings</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {data.communicationSummary?.voiceMessagesCount ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <p className="text-zinc-500">Total Calls</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums">
                {data.communicationSummary?.totalCalls ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <p className="text-zinc-500">Video Calls</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
                {data.communicationSummary?.videoCallsCount ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <p className="text-zinc-500">Audio Calls</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {data.communicationSummary?.audioCallsCount ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products & Popular Articles */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold">Top Viewed Products &amp; PDF Books</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
              {data.topProducts.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{p.title}</p>
                    <p className="text-[11px] text-zinc-500">
                      {p.category} · NPR {p.priceNpr.toLocaleString('en-US')} / ${p.priceUsd}
                    </p>
                  </div>
                  <span className="font-mono font-semibold tabular-nums text-blue-600 dark:text-blue-400 shrink-0">
                    {p.views} views
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold">Popular Articles</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
              {data.popularArticles.map((art) => (
                <div key={art.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{art.title}</p>
                    <p className="text-[11px] text-zinc-500">
                      {art.categoryName} · {art.commentsCount} comments
                    </p>
                  </div>
                  <span className="font-mono font-semibold tabular-nums text-blue-600 dark:text-blue-400 shrink-0">
                    {art.views} views
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AdminLiveChatAndSubscribersPanel() {
  const qc = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [liveMessages, setLiveMessages] = useState<ChatMessageDto[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const selectedConvIdRef = useRef<number | null>(null);
  selectedConvIdRef.current = selectedConvId;

  const callMgr = useWebRtcCallManager({
    wsRef,
    localName: 'Pramesh Bhattarai',
  });
  const callSignalHandlerRef = useRef(callMgr.handleWsSignal);
  callSignalHandlerRef.current = callMgr.handleWsSignal;

  const conversationsQuery = useQuery({
    queryKey: ['admin-chat-conversations'],
    queryFn: adminApi.getChatConversations,
  });

  const activeThreadQuery = useQuery({
    queryKey: ['admin-chat-thread', selectedConvId],
    queryFn: () => adminApi.getChatMessages(selectedConvId!),
    enabled: Boolean(selectedConvId),
  });

  const callsQuery = useQuery({
    queryKey: ['admin-chat-calls'],
    queryFn: adminApi.getChatCalls,
  });

  useEffect(() => {
    if (activeThreadQuery.data?.messages) {
      setLiveMessages(activeThreadQuery.data.messages);
    }
  }, [activeThreadQuery.data]);

  useEffect(() => {
    if (!selectedConvId && conversationsQuery.data && conversationsQuery.data.length > 0) {
      setSelectedConvId(conversationsQuery.data[0].id);
    }
  }, [conversationsQuery.data, selectedConvId]);

  useEffect(() => {
    const { accessToken } = getStoredTokens();
    if (!accessToken) return;

    let ws: WebSocket | null = null;
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      try {
        ws = new WebSocket(buildWebSocketUrl({ role: 'admin', token: accessToken }));
        wsRef.current = ws;
        ws.onopen = () => {
          if (!unmounted) setWsConnected(true);
        };
        ws.onclose = () => {
          if (!unmounted) {
            setWsConnected(false);
            if (wsRef.current === ws) wsRef.current = null;
          }
        };
        ws.onmessage = (evt) => {
          try {
            const payload = JSON.parse(String(evt.data || '{}')) as {
              type?: string;
              conversationId?: number;
              message?: ChatMessageDto;
              ack?: boolean;
              callId?: number;
              callType?: 'audio' | 'video';
              callerName?: string;
              sessionToken?: string;
              classSessionId?: number;
              sdp?: RTCSessionDescriptionInit;
              candidate?: RTCIceCandidateInit;
            };

            if (payload.type === 'chat:message' && payload.message) {
              qc.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
              if (payload.conversationId === selectedConvIdRef.current) {
                const msg = payload.message;
                setLiveMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
              }
            }

            if (payload.type?.startsWith('call:') || payload.type?.startsWith('webrtc:')) {
              void callSignalHandlerRef.current(payload);
              if (
                payload.type === 'call:invite' ||
                payload.type === 'call:end' ||
                payload.type === 'call:decline'
              ) {
                qc.invalidateQueries({ queryKey: ['admin-chat-calls'] });
              }
            }
          } catch {
            // Ignore malformed socket frames
          }
        };
      } catch {
        setWsConnected(false);
      }
    };

    connect();
    return () => {
      unmounted = true;
      if (ws && ws.readyState <= WebSocket.OPEN) ws.close();
      wsRef.current = null;
    };
  }, [qc]);

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) => adminApi.replyChatConversation(id, message),
    onSuccess: (msg) => {
      setLiveMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setReplyText('');
      qc.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
    },
    onError: () => toast.error('Could not send reply.'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'open' | 'closed' }) => adminApi.updateChatStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
      qc.invalidateQueries({ queryKey: ['admin-chat-thread', selectedConvId] });
      toast.success('Conversation status updated.');
    },
  });

  const newsletterQuery = useQuery({
    queryKey: ['admin-newsletter'],
    queryFn: adminApi.getNewsletterSubscribers,
  });

  const commentsQuery = useQuery({
    queryKey: ['admin-blog-comments'],
    queryFn: adminApi.getAdminBlogComments,
  });

  const deleteSubscriber = useMutation({
    mutationFn: adminApi.deleteNewsletterSubscriber,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-newsletter'] });
      toast.success('Subscriber removed.');
    },
  });

  const deleteComment = useMutation({
    mutationFn: adminApi.deleteAdminBlogComment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-blog-comments'] });
      toast.success('Comment deleted.');
    },
  });

  const handleReplySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedConvId || !replyText.trim()) return;
    replyMutation.mutate({ id: selectedConvId, message: replyText.trim() });
  };

  const handleSendAdminVoice = async (file: File, durationSec: number) => {
    if (!selectedConvId) return;
    const saved = await adminApi.uploadChatVoice(selectedConvId, file, durationSec);
    setLiveMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
    qc.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
  };

  const selectedConv = activeThreadQuery.data?.conversation;
  const conversations = conversationsQuery.data || [];
  const callLogs = callsQuery.data || [];

  return (
    <div className="space-y-6">
      {/* Real-Time Support Chat, Voice & Video Inbox */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold">Live Chat, Voice Notes, Audio &amp; Video Calls</h2>
            </div>
            <p className="text-xs text-zinc-500">
              WebSocket connection: {wsConnected ? 'Connected (real-time)' : 'Standby'} · Chat, send voice recordings, or start live calls.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Threads List */}
            <div className="lg:col-span-4 border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800 max-h-96 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="p-4 text-xs text-zinc-500">No live chat sessions yet.</p>
              ) : (
                conversations.map((conv) => {
                  const active = selectedConvId === conv.id;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setSelectedConvId(conv.id)}
                      className={`w-full text-left p-3 transition-colors cursor-pointer ${
                        active ? 'bg-blue-600/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {conv.visitorName}
                        </span>
                        {conv.unreadAdminCount > 0 ? (
                          <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            {conv.unreadAdminCount} new
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] uppercase text-zinc-400">{conv.status}</span>
                        )}
                      </div>
                      {conv.visitorEmail ? (
                        <p className="text-[11px] text-zinc-500 truncate">{conv.visitorEmail}</p>
                      ) : null}
                      {conv.lastMessage ? (
                        <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                          {conv.lastMessage}
                        </p>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>

            {/* Active Conversation */}
            <div className="lg:col-span-8 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col h-96 overflow-hidden">
              {selectedConv ? (
                <>
                  <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0B0B0D] flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">
                        {selectedConv.visitorName}{' '}
                        {selectedConv.visitorEmail ? `(${selectedConv.visitorEmail})` : ''}
                      </p>
                      <p className="font-mono text-[10px] text-zinc-500">{selectedConv.sessionToken}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void callMgr.startOutgoingCall(
                            'audio',
                            selectedConv.visitorName,
                            selectedConv.sessionToken
                          )
                        }
                        aria-label="Start audio call with visitor"
                        title="Audio Call"
                      >
                        <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Audio Call</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void callMgr.startOutgoingCall(
                            'video',
                            selectedConv.visitorName,
                            selectedConv.sessionToken
                          )
                        }
                        aria-label="Start video call with visitor"
                        title="Video Call"
                      >
                        <Video className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Video Call</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          statusMutation.mutate({
                            id: selectedConv.id,
                            status: selectedConv.status === 'open' ? 'closed' : 'open',
                          })
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{selectedConv.status === 'open' ? 'Mark Closed' : 'Reopen'}</span>
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {liveMessages.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-8">No messages in this conversation yet.</p>
                    ) : (
                      liveMessages.map((msg) => {
                        const isAdmin = msg.senderRole === 'admin';
                        return (
                          <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                                isAdmin
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                              }`}
                            >
                              <p className="text-[10px] opacity-80 mb-0.5">{msg.senderName}</p>
                              <ChatMessageMedia
                                messageType={msg.messageType}
                                message={msg.message}
                                mediaUrl={msg.mediaUrl}
                                mediaDurationSec={msg.mediaDurationSec}
                                isOwnBubble={isAdmin}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form
                    onSubmit={handleReplySubmit}
                    className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2"
                  >
                    <Input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Reply to visitor in real time..."
                      className="h-9 text-xs"
                    />
                    <VoiceRecorderButton compact onSendVoice={handleSendAdminVoice} />
                    <Button type="submit" size="sm" disabled={replyMutation.isPending || !replyText.trim()}>
                      <Send className="h-3.5 w-3.5" />
                      <span>Reply</span>
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-zinc-500">
                  Select a live chat thread on the left to reply, record voice notes, or start a call.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call History Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold">Recent Audio &amp; Video Call History ({callLogs.length})</h2>
          </div>
          <p className="text-xs text-zinc-500">
            WebRTC signaling logs stored in database across Live Support Chat &amp; Online Classrooms.
          </p>
        </CardHeader>
        <CardContent>
          {callLogs.length === 0 ? (
            <p className="text-xs text-zinc-500">No audio or video calls initiated yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">Caller</th>
                    <th className="py-2 pr-3 font-medium">Participant / Room</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Duration</th>
                    <th className="py-2 font-medium">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono tabular-nums">
                  {callLogs.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-3 uppercase font-semibold">
                        <span className="inline-flex items-center gap-1">
                          {c.callType === 'video' ? (
                            <Video className="h-3.5 w-3.5 text-blue-500" />
                          ) : (
                            <Phone className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                          {c.callType}
                        </span>
                      </td>
                      <td className="py-2 pr-3 font-sans">
                        {c.initiatedByName} ({c.initiatedByRole})
                      </td>
                      <td className="py-2 pr-3 font-sans text-zinc-500">
                        {c.classSessionId ? `Classroom #${c.classSessionId}` : c.visitorName || 'Visitor'}
                      </td>
                      <td className="py-2 pr-3 uppercase text-blue-600 dark:text-blue-400">{c.status}</td>
                      <td className="py-2 pr-3">{formatSecondsClock(c.durationSeconds || 0)}</td>
                      <td className="py-2 text-zinc-500">{c.startedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Newsletter Subscribers & Blog Comment Moderation */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold">
                Newsletter Subscribers ({(newsletterQuery.data || []).length})
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            {(newsletterQuery.data || []).length === 0 ? (
              <p className="text-xs text-zinc-500">No newsletter subscribers yet.</p>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs max-h-72 overflow-y-auto">
                {(newsletterQuery.data || []).map((sub) => (
                  <div key={sub.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{sub.email}</p>
                      <p className="font-mono text-[11px] text-zinc-500">{sub.createdAt}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteSubscriber.mutate(sub.id)}
                      aria-label={`Remove ${sub.email}`}
                      className="text-zinc-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold">
                Article Comments Moderation ({(commentsQuery.data || []).length})
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            {(commentsQuery.data || []).length === 0 ? (
              <p className="text-xs text-zinc-500">No blog article comments yet.</p>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs max-h-72 overflow-y-auto">
                {(commentsQuery.data || []).map((c) => (
                  <div key={c.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {c.authorName} <span className="font-normal text-zinc-500">on {c.postTitle}</span>
                      </p>
                      <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">{c.comment}</p>
                      <p className="font-mono text-[10px] text-zinc-400 mt-0.5">{c.createdAt}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteComment.mutate(c.id)}
                      aria-label={`Delete comment by ${c.authorName}`}
                      className="text-zinc-400 hover:text-red-500 cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CallSessionModal
        callState={callMgr.callState}
        micMuted={callMgr.micMuted}
        cameraOff={callMgr.cameraOff}
        elapsedSeconds={callMgr.elapsedSeconds}
        localVideoRef={callMgr.localVideoRef}
        remoteVideoRef={callMgr.remoteVideoRef}
        remoteAudioRef={callMgr.remoteAudioRef}
        onAccept={callMgr.acceptIncomingCall}
        onEnd={callMgr.declineOrEndCall}
        onToggleMute={callMgr.toggleMute}
        onToggleCamera={callMgr.toggleCamera}
        onRetryMedia={callMgr.retryLocalMedia}
      />
    </div>
  );
}
