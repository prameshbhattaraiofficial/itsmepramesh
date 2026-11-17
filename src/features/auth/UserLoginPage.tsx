import { useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '@/src/app/providers/AuthProvider';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import { CustomerAuthForm } from './CustomerAuthForm';

export function UserLoginPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `${t('navSignIn')} — Pramesh Bhattarai`;
  }, [t]);

  if (user) {
    return <Navigate to={user.role === 'Admin' ? '/admin' : '/dashboard'} replace />;
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t('backToPortfolio')}</span>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-blue-600 dark:text-blue-400 mb-2">
              <Lock className="h-5 w-5" />
            </div>
            <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {t('portalSignIn')}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('portalSignInSubtitle')}
            </p>
          </CardHeader>

          <CardContent>
            <CustomerAuthForm
              description="New accounts receive a welcome email upon registration, plus instant emails on Add to Cart and orders."
              onSuccess={(signedInUser) =>
                navigate(signedInUser.role === 'Admin' ? '/admin' : '/dashboard')
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
