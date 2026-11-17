import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogIn, MoreVertical, X } from 'lucide-react';
import { useAuth } from '@/src/app/providers/AuthProvider';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { Button } from '@/src/components/ui/Button';
import { ThemeToggle } from '@/src/components/common/ThemeToggle';
import { LanguageToggle } from '@/src/components/common/LanguageToggle';

interface NavbarProps {
  brandName: string;
  blogEnabled?: boolean;
}

export function Navbar({ brandName, blogEnabled = false }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    { key: 'about', label: t('navAbout'), hash: '#about' },
    { key: 'experience', label: t('navExperience'), hash: '#experience' },
    { key: 'education', label: t('navEducation'), hash: '#education' },
    { key: 'certifications', label: t('navCertifications'), hash: '#certifications' },
    { key: 'projects', label: t('navProjects'), hash: '#projects' },
    { key: 'services', label: t('navServices'), hash: '#services' },
    ...(blogEnabled ? [{ key: 'articles', label: t('navArticles'), route: '/blog' }] : []),
    { key: 'products', label: t('navProducts'), route: '/products' },
    { key: 'classes', label: t('navClasses'), route: '/classes' },
  ];

  const mobileOnlyItems = [
    { key: 'achievements', label: t('navAchievements'), hash: '#achievements' },
    { key: 'testimonials', label: t('navTestimonials'), hash: '#testimonials' },
  ];

  const handleNavClick = (item: { label: string; hash?: string; route?: string }) => {
    setMobileOpen(false);
    if (item.route) {
      navigate(item.route);
      return;
    }
    if (item.hash) {
      if (location.pathname !== '/') {
        navigate(`/${item.hash}`);
      } else {
        const el = document.querySelector(item.hash);
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handlePrimaryCta = () => {
    setMobileOpen(false);
    if (location.pathname !== '/') {
      navigate('/#contact');
    } else {
      document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/90 dark:bg-[#050505]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 xl:gap-6 px-6">
        {/* Zone 1: Single-line brand wordmark */}
        <Link
          to="/"
          className="font-display text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 whitespace-nowrap shrink-0"
        >
          {brandName}
        </Link>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-3 xl:gap-4">
          {navItems.map((item) => {
            const isActive = item.route ? location.pathname.startsWith(item.route) : false;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavClick(item)}
                className={`text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer underline-offset-8 decoration-blue-600 dark:decoration-blue-400 ${
                  isActive
                    ? 'text-zinc-900 dark:text-zinc-50 underline'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:underline'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Portal/Sign-In + Language switcher + Theme switcher + primary CTA + vertical menu button */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <Link
              to={user.role === 'Admin' ? '/admin' : '/dashboard'}
              aria-label={user.role === 'Admin' ? t('navAdminDashboard') : t('navMyDashboard')}
              title={user.role === 'Admin' ? t('navAdminDashboard') : t('navMyDashboard')}
              className="hidden lg:inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 px-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:border-blue-500/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>{user.role === 'Admin' ? t('navAdmin') : t('navDashboard')}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              aria-label={t('navSignIn')}
              title={t('portalSignIn')}
              className="hidden lg:inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 px-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:border-blue-500/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{t('navSignIn')}</span>
            </Link>
          )}
          <LanguageToggle className="hidden lg:inline-flex" />
          <ThemeToggle className="hidden lg:inline-flex" />
          <Button size="sm" onClick={handlePrimaryCta} className="hidden lg:inline-flex">
            {t('navGetInTouch')}
          </Button>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex lg:hidden h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <MoreVertical className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Vertical Navigation Drawer (< lg viewports) */}
      {mobileOpen ? (
        <div className="lg:hidden border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#050505] px-6 py-4 space-y-3">
          <div className="flex flex-col space-y-1">
            {[...navItems, ...mobileOnlyItems].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavClick(item)}
                className="py-2 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 cursor-pointer"
              >
                {item.label}
              </button>
            ))}
            {user ? (
              <>
                <Link
                  to={user.role === 'Admin' ? '/admin' : '/dashboard'}
                  onClick={() => setMobileOpen(false)}
                  className="py-2 inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{user.role === 'Admin' ? t('navAdminDashboard') : t('navMyDashboard')}</span>
                </Link>
                <div className="py-2 flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="truncate">{user.email}</span>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="text-zinc-700 dark:text-zinc-300 hover:underline cursor-pointer shrink-0"
                  >
                    {t('navSignOut')}
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="py-2 inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <LogIn className="h-4 w-4" />
                <span>{t('navSignInRegister')}</span>
              </Link>
            )}
          </div>
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
            <Button size="sm" onClick={handlePrimaryCta}>
              {t('navGetInTouch')}
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
