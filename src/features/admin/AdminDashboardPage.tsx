import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Award,
  BarChart3,
  Bell,
  Briefcase,
  ExternalLink,
  FileText,
  FolderGit2,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  MoreVertical,
  Settings,
  ShoppingBag,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '@/src/app/providers/AuthProvider';
import { adminApi } from '@/src/services/api/adminApi';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import { getStoredTokens } from '@/src/services/api/httpClient';
import { buildWebSocketUrl } from '@/src/utils/analytics';
import { LanguageToggle } from '@/src/components/common/LanguageToggle';
import { ThemeToggle } from '@/src/components/common/ThemeToggle';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import { Skeleton } from '@/src/components/ui/SwitchAndSkeleton';
import {
  ExperienceAdminPanel,
  ProductsAndOrdersAdminPanel,
  ProfileSettingsPanel,
  ProjectsAdminPanel,
  SkillsAdminPanel,
} from '@/src/features/admin/AdminPanels';
import {
  CredentialsAdminPanel,
  MessagesAndMediaPanel,
  SecuritySettingsCard,
  ServicesTestimonialsBlogPanel,
} from '@/src/features/admin/AdminContentPanels';
import {
  AdminAnalyticsPanel,
  AdminLiveChatAndSubscribersPanel,
} from '@/src/features/admin/AdminAnalyticsAndChatPanels';
import { AdminAcademyPanel } from '@/src/features/admin/AdminAcademyPanel';
import type { AdminNotificationDto } from '@/src/types/portfolio';

type AdminTab =
  | 'overview'
  | 'academy'
  | 'analytics'
  | 'livechat'
  | 'profile'
  | 'projects'
  | 'products'
  | 'experience'
  | 'skills'
  | 'credentials'
  | 'content'
  | 'inbox';

function TabLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function AdminDashboardPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotificationDto[]>([]);

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    if (!isAdmin) return;
    const { accessToken } = getStoredTokens();
    if (!accessToken) return;

    let ws: WebSocket | null = null;
    let unmounted = false;

    try {
      ws = new WebSocket(buildWebSocketUrl({ role: 'admin', token: accessToken }));
      ws.onmessage = (evt) => {
        if (unmounted) return;
        try {
          const payload = JSON.parse(String(evt.data || '{}')) as AdminNotificationDto & { type?: string };
          if (payload.type === 'admin:notification' && payload.id) {
            setNotifications((prev) =>
              prev.some((n) => n.id === payload.id) ? prev : [payload, ...prev].slice(0, 15)
            );
            toast.info(`${payload.title}: ${payload.message}`);
            qc.invalidateQueries({ queryKey: ['admin-overview'] });
            qc.invalidateQueries({ queryKey: ['admin-analytics'] });
            qc.invalidateQueries({ queryKey: ['admin-orders'] });
            qc.invalidateQueries({ queryKey: ['admin-messages'] });
            qc.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
          }
        } catch {
          // Ignore malformed WS payloads
        }
      };
    } catch {
      // Ignore WS init failures
    }

    return () => {
      unmounted = true;
      if (ws && ws.readyState <= WebSocket.OPEN) ws.close();
    };
  }, [isAdmin, qc]);

  const overviewQuery = useQuery({
    queryKey: ['admin-overview'],
    queryFn: adminApi.getOverview,
    enabled: Boolean(isAdmin),
  });
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: portfolioApi.getProfile, enabled: Boolean(isAdmin) });
  const projectsQuery = useQuery({
    queryKey: ['projects', 'admin'],
    queryFn: () => portfolioApi.getProjects({ pageSize: 50 }),
    enabled: Boolean(isAdmin),
  });
  const expQuery = useQuery({ queryKey: ['experiences'], queryFn: portfolioApi.getExperiences, enabled: Boolean(isAdmin) });
  const skillsQuery = useQuery({ queryKey: ['skills'], queryFn: portfolioApi.getSkills, enabled: Boolean(isAdmin) });
  const eduQuery = useQuery({ queryKey: ['education'], queryFn: portfolioApi.getEducation, enabled: Boolean(isAdmin) });
  const achQuery = useQuery({ queryKey: ['achievements'], queryFn: portfolioApi.getAchievements, enabled: Boolean(isAdmin) });
  const servicesQuery = useQuery({ queryKey: ['services'], queryFn: portfolioApi.getServices, enabled: Boolean(isAdmin) });
  const testimonialsQuery = useQuery({
    queryKey: ['testimonials'],
    queryFn: portfolioApi.getTestimonials,
    enabled: Boolean(isAdmin),
  });
  const blogQuery = useQuery({ queryKey: ['admin-blog'], queryFn: adminApi.getBlogPosts, enabled: Boolean(isAdmin) });
  const messagesQuery = useQuery({ queryKey: ['admin-messages'], queryFn: adminApi.getMessages, enabled: Boolean(isAdmin) });
  const mediaQuery = useQuery({ queryKey: ['admin-media'], queryFn: adminApi.getMedia, enabled: Boolean(isAdmin) });
  const productsAdminQuery = useQuery({
    queryKey: ['admin-products'],
    queryFn: adminApi.getProducts,
    enabled: Boolean(isAdmin),
  });
  const ordersAdminQuery = useQuery({
    queryKey: ['admin-orders'],
    queryFn: adminApi.getOrders,
    enabled: Boolean(isAdmin),
  });

  if (authLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  const overview = overviewQuery.data;

  const navItems: {
    id: AdminTab;
    label: string;
    icon: typeof LayoutDashboard;
    count?: number;
  }[] = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'academy', label: 'Students & Online Classes', icon: GraduationCap },
    { id: 'analytics', label: 'Analytics & Insights', icon: BarChart3 },
    { id: 'livechat', label: 'Live Chat & Newsletter', icon: MessageSquare, count: notifications.filter((n) => n.category === 'chat').length || undefined },
    { id: 'profile', label: 'Profile, Bio & SEO', icon: Settings },
    { id: 'projects', label: 'Projects & Case Studies', icon: FolderGit2, count: overview?.projectsCount },
    { id: 'products', label: 'Products & Orders', icon: ShoppingBag, count: overview?.productsCount },
    { id: 'experience', label: 'Work Experience', icon: Briefcase, count: overview?.experiencesCount },
    { id: 'skills', label: 'Skills & Categories', icon: Wrench, count: overview?.skillsCount },
    {
      id: 'credentials',
      label: 'Education & Certs',
      icon: Award,
      count:
        overview &&
        (overview.educationCount || 0) + (overview.certificationsCount || 0) + (overview.achievementsCount || 0),
    },
    {
      id: 'content',
      label: 'Services, Reviews & Blog',
      icon: FileText,
      count: overview && overview.servicesCount + (overview.testimonialsCount || 0) + overview.blogPostsCount,
    },
    { id: 'inbox', label: 'Messages & Media', icon: Inbox, count: overview?.unreadMessagesCount },
  ];

  const kpiCards: {
    label: string;
    value: number;
    sublabel: string;
    tab: AdminTab;
    accent?: boolean;
  }[] = overview
    ? [
        { label: 'Projects', value: overview.projectsCount, sublabel: 'Case Studies CRUD', tab: 'projects' },
        { label: 'Products', value: overview.productsCount ?? 0, sublabel: 'Store Catalog', tab: 'products' },
        {
          label: 'Orders',
          value: overview.ordersCount ?? 0,
          sublabel: `${overview.pendingOrdersCount ?? 0} pending`,
          tab: 'products',
        },
        { label: 'Experience', value: overview.experiencesCount, sublabel: 'Career Roles', tab: 'experience' },
        {
          label: 'Skills',
          value: overview.skillsCount,
          sublabel: `${overview.skillCategoriesCount ?? 0} categories`,
          tab: 'skills',
        },
        { label: 'Education', value: overview.educationCount ?? 0, sublabel: 'Degrees', tab: 'credentials' },
        {
          label: 'Certifications',
          value: overview.certificationsCount ?? 0,
          sublabel: 'Credentials',
          tab: 'credentials',
        },
        {
          label: 'Achievements',
          value: overview.achievementsCount ?? 0,
          sublabel: 'Milestones',
          tab: 'credentials',
        },
        { label: 'Services', value: overview.servicesCount, sublabel: 'Offerings', tab: 'content' },
        {
          label: 'Testimonials',
          value: overview.testimonialsCount ?? 0,
          sublabel: 'Endorsements',
          tab: 'content',
        },
        {
          label: 'Blog Articles',
          value: overview.blogPostsCount,
          sublabel: overview.blogEnabled ? 'Public' : 'Hidden',
          tab: 'content',
        },
        {
          label: 'Unread Inbox',
          value: overview.unreadMessagesCount,
          sublabel: `${overview.mediaCount} media files`,
          tab: 'inbox',
          accent: overview.unreadMessagesCount > 0,
        },
      ]
    : [];

  const handleSelectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 flex flex-col md:flex-row">
      {/* Persistent Vertical Sidebar on md+ & Collapsible Vertical Sidebar on Mobile */}
      <aside
        className={`${
          mobileNavOpen ? 'flex' : 'hidden'
        } md:flex w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0B0D] p-5 flex-col justify-between md:sticky md:top-0 md:h-screen md:overflow-y-auto`}
      >
        <div>
          <div className="flex items-center justify-between pb-5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="min-w-0">
              <p className="font-display text-base font-bold">Portfolio Admin</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close admin sidebar"
              className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav aria-label="Admin dashboard navigation" className="mt-5 flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {typeof item.count === 'number' ? (
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        active ? 'text-blue-100' : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {item.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-2 pt-6 mt-6 border-t border-zinc-200 dark:border-zinc-800">
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>View Live Site</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => logout()}>
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0B0D] px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label={mobileNavOpen ? 'Close admin sidebar' : 'Open admin sidebar'}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer shrink-0"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <MoreVertical className="h-4 w-4" />}
            </button>
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate">
              Admin / {navItems.find((n) => n.id === activeTab)?.label}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <LanguageToggle />
            <ThemeToggle />
            <Button variant="outline" size="sm" className="md:hidden" asChild>
              <Link to="/">Live Site</Link>
            </Button>
            <Button variant="outline" size="sm" className="md:hidden" onClick={() => logout()}>
              Sign Out
            </Button>
          </div>
        </header>

        <main className="p-6 max-w-6xl w-full space-y-6">
          {activeTab === 'overview' ? (
            overview ? (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    Site Content &amp; Operations Dashboard
                  </h1>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Select any module below to create, edit, or delete live site content. Changes publish immediately.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {kpiCards.map((kpi) => (
                    <button
                      key={kpi.label}
                      type="button"
                      onClick={() => setActiveTab(kpi.tab)}
                      className="text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-4 hover:border-blue-500/60 dark:hover:border-blue-500/60 transition-colors cursor-pointer"
                    >
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{kpi.label}</p>
                      <p
                        className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
                          kpi.accent ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-900 dark:text-zinc-50'
                        }`}
                      >
                        {kpi.value}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{kpi.sublabel}</p>
                    </button>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-base font-semibold">Live Order &amp; Activity Alerts</h2>
                      </div>
                      {notifications.length > 0 ? (
                        <Button variant="ghost" size="sm" onClick={() => setNotifications([])}>
                          Clear
                        </Button>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {notifications.length === 0 ? (
                      <p className="text-xs text-zinc-500">
                        Listening in real time for new orders, eSewa payments, contact inquiries, and live chat messages.
                      </p>
                    ) : (
                      <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                        {notifications.map((n) => (
                          <div key={n.id} className="py-2 flex items-center justify-between gap-3">
                            <div>
                              <span className="font-mono font-semibold uppercase text-blue-600 dark:text-blue-400">
                                {n.category}
                              </span>{' '}
                              <span className="font-medium">{n.title}</span> —{' '}
                              <span className="text-zinc-600 dark:text-zinc-400">{n.message}</span>
                            </div>
                            <span className="font-mono text-[11px] text-zinc-500 shrink-0">
                              {n.createdAt.slice(11, 19)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <h2 className="text-base font-semibold">Recent Administrative Audit Log</h2>
                  </CardHeader>
                  <CardContent>
                    {overview.recentLogs.length === 0 ? (
                      <p className="text-xs text-zinc-500">No audit events recorded yet.</p>
                    ) : (
                      <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                        {overview.recentLogs.map((log) => (
                          <div
                            key={log.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2.5"
                          >
                            <div>
                              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                                {log.action}
                              </span>{' '}
                              <span className="font-medium">{log.entityType}</span>{' '}
                              <span className="text-zinc-500">— {log.details}</span>
                            </div>
                            <span className="font-mono text-zinc-500 tabular-nums">{log.createdAt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <SecuritySettingsCard />
              </div>
            ) : (
              <TabLoadingSkeleton />
            )
          ) : null}

          {activeTab === 'academy' ? <AdminAcademyPanel /> : null}
          {activeTab === 'analytics' ? <AdminAnalyticsPanel /> : null}
          {activeTab === 'livechat' ? <AdminLiveChatAndSubscribersPanel /> : null}

          {activeTab === 'profile' ? (
            profileQuery.data ? (
              <ProfileSettingsPanel profile={profileQuery.data} />
            ) : (
              <TabLoadingSkeleton />
            )
          ) : null}

          {activeTab === 'projects' ? (
            projectsQuery.data ? (
              <ProjectsAdminPanel projects={projectsQuery.data.items} />
            ) : (
              <TabLoadingSkeleton />
            )
          ) : null}

          {activeTab === 'products' ? (
            productsAdminQuery.data && ordersAdminQuery.data ? (
              <ProductsAndOrdersAdminPanel
                products={productsAdminQuery.data}
                orders={ordersAdminQuery.data}
              />
            ) : (
              <TabLoadingSkeleton />
            )
          ) : null}

          {activeTab === 'experience' ? (
            expQuery.data ? (
              <ExperienceAdminPanel experiences={expQuery.data} />
            ) : (
              <TabLoadingSkeleton />
            )
          ) : null}

          {activeTab === 'skills' ? (
            skillsQuery.data ? (
              <SkillsAdminPanel categories={skillsQuery.data} />
            ) : (
              <TabLoadingSkeleton />
            )
          ) : null}

          {activeTab === 'credentials' ? (
            eduQuery.data && achQuery.data ? (
              <CredentialsAdminPanel
                education={eduQuery.data.education}
                certifications={achQuery.data.certifications || eduQuery.data.certifications}
                achievements={achQuery.data.achievements || []}
              />
            ) : (
              <TabLoadingSkeleton />
            )
          ) : null}

          {activeTab === 'content' ? (
            servicesQuery.data && testimonialsQuery.data && blogQuery.data ? (
              <ServicesTestimonialsBlogPanel
                services={servicesQuery.data}
                testimonials={testimonialsQuery.data}
                blogPosts={blogQuery.data}
              />
            ) : (
              <TabLoadingSkeleton />
            )
          ) : null}

          {activeTab === 'inbox' ? (
            messagesQuery.data && mediaQuery.data ? (
              <MessagesAndMediaPanel messages={messagesQuery.data} media={mediaQuery.data} />
            ) : (
              <TabLoadingSkeleton />
            )
          ) : null}
        </main>
      </div>
    </div>
  );
}
