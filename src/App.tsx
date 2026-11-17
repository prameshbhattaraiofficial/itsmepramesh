import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/src/app/providers/ThemeProvider';
import { LanguageProvider } from '@/src/app/providers/LanguageProvider';
import { QueryProvider } from '@/src/app/providers/QueryProvider';
import { AuthProvider } from '@/src/app/providers/AuthProvider';
import { CartProvider } from '@/src/features/products/CartContext';
import { CartDrawer } from '@/src/features/products/CartDrawer';
import { ErrorBoundary } from '@/src/components/common/ErrorBoundary';
import { LiveChatWidget } from '@/src/components/common/LiveChatWidget';
import { Navbar } from '@/src/components/layout/Navbar';
import { Footer } from '@/src/components/layout/Footer';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import { trackAnalyticsSafe } from '@/src/utils/analytics';
import { PortfolioHomePage } from '@/src/features/home/PortfolioHomePage';
import { Skeleton } from '@/src/components/ui/SwitchAndSkeleton';

const ProjectDetailPage = lazy(() =>
  import('@/src/features/projects/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage }))
);
const ProductsPage = lazy(() =>
  import('@/src/features/products/ProductsPage').then((m) => ({ default: m.ProductsPage }))
);
const PublicClassesPage = lazy(() =>
  import('@/src/features/academy/PublicClassesPage').then((m) => ({ default: m.PublicClassesPage }))
);
const ProductDetailPage = lazy(() =>
  import('@/src/features/products/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const EsewaSuccessPage = lazy(() =>
  import('@/src/features/products/EsewaCallbackPages').then((m) => ({ default: m.EsewaSuccessPage }))
);
const EsewaFailurePage = lazy(() =>
  import('@/src/features/products/EsewaCallbackPages').then((m) => ({ default: m.EsewaFailurePage }))
);
const BlogListPage = lazy(() =>
  import('@/src/features/blog/BlogPages').then((m) => ({ default: m.BlogListPage }))
);
const BlogDetailPage = lazy(() =>
  import('@/src/features/blog/BlogPages').then((m) => ({ default: m.BlogDetailPage }))
);
const AdminLoginPage = lazy(() =>
  import('@/src/features/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage }))
);
const UserLoginPage = lazy(() =>
  import('@/src/features/auth/UserLoginPage').then((m) => ({ default: m.UserLoginPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('@/src/features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);
const UserDashboardPage = lazy(() =>
  import('@/src/features/dashboard/UserDashboardPage').then((m) => ({ default: m.UserDashboardPage }))
);
const AdminDashboardPage = lazy(() =>
  import('@/src/features/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);

function RouteLoadingFallback() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16 space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function AppShell() {
  const location = useLocation();
  const isAdminDashboard = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';
  const isPortalRoute = isAdminDashboard || location.pathname.startsWith('/dashboard');
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: portfolioApi.getProfile });

  useEffect(() => {
    if (!location.pathname.startsWith('/admin')) {
      trackAnalyticsSafe({ eventType: 'page_view', path: location.pathname });
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-[#050505] text-zinc-900 dark:text-zinc-100">
      {!isPortalRoute ? (
        <Navbar brandName={profile?.fullName || 'Pramesh Bhattarai'} blogEnabled={profile?.blogEnabled} />
      ) : null}

      <main className="flex-1">
        <ErrorBoundary>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route path="/" element={<PortfolioHomePage />} />
              <Route path="/projects/:slug" element={<ProjectDetailPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:slug" element={<ProductDetailPage />} />
              <Route path="/classes" element={<PublicClassesPage />} />
              <Route path="/payment/esewa/success" element={<EsewaSuccessPage />} />
              <Route path="/payment/esewa/failure" element={<EsewaFailurePage />} />
              <Route path="/blog" element={<BlogListPage />} />
              <Route path="/blog/:slug" element={<BlogDetailPage />} />
              <Route path="/login" element={<UserLoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ForgotPasswordPage />} />
              <Route path="/dashboard" element={<UserDashboardPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {!isPortalRoute ? <Footer profile={profile} /> : null}
      {!isAdminDashboard ? <CartDrawer /> : null}
      {!isAdminDashboard ? <LiveChatWidget whatsappPhone={profile?.phonePrimary || '9779863439135'} /> : null}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <CartProvider>
              <BrowserRouter>
                <AppShell />
                <Toaster richColors position="bottom-right" />
              </BrowserRouter>
            </CartProvider>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
