import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { useAuth } from '@/src/app/providers/AuthProvider';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { Button } from '@/src/components/ui/Button';
import { Input, PasswordInput } from '@/src/components/ui/Input';
import type { AuthTokensDto } from '@/src/types/portfolio';

interface CustomerAuthFormProps {
  initialMode?: 'login' | 'register';
  description?: string;
  onSuccess?: (user: AuthTokensDto['user']) => void;
}

export function CustomerAuthForm({ initialMode = 'login', description, onSuccess }: CustomerAuthFormProps) {
  const { login, register } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await login(email.trim(), password);
        toast.success(`Signed in as ${res.user.email}.`);
        onSuccess?.(res.user);
      } else {
        const res = await register(fullName.trim(), email.trim(), password);
        toast.success(
          res.welcomeEmailSent
            ? `Account created! Welcome email sent to ${res.user.email}.`
            : `Account created! Welcome email queued for ${res.user.email}.`
        );
        onSuccess?.(res.user);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (mode === 'login' ? 'Invalid email or password.' : 'Could not create account.');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {description ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
          <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span>{description}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#0B0B0D] p-1">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
            mode === 'login'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          {t('signInTab')}
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
            mode === 'register'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          {t('createAccountTab')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' ? (
          <div>
            <label htmlFor="customer-auth-name" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t('fullName')}
            </label>
            <Input
              id="customer-auth-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>
        ) : null}

        <div>
          <label htmlFor="customer-auth-email" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            {t('emailAddress')}
          </label>
          <Input
            id="customer-auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label htmlFor="customer-auth-password" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            {t('password')}
          </label>
          <PasswordInput
            id="customer-auth-password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'login' ? 'Enter your password' : 'Min 8 chars (letter + number)'}
            minLength={mode === 'register' ? 8 : 6}
            required
          />
          {mode === 'login' ? (
            <div className="mt-1.5 flex justify-end">
              <Link
                to={email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : '/forgot-password'}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('forgotPassword')}
              </Link>
            </div>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting
            ? mode === 'login'
              ? 'Signing In...'
              : 'Creating Account...'
            : mode === 'login'
              ? t('signInTab')
              : t('createAccountTab')}
        </Button>
      </form>
    </div>
  );
}
