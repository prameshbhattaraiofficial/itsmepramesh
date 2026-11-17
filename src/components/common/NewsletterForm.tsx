import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { MailCheck } from 'lucide-react';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';

export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const res = await portfolioApi.subscribeNewsletter({ email: email.trim() });
      toast.success(res.message);
      setEmail('');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Please enter a valid email address.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={compact ? 'flex flex-col sm:flex-row gap-2' : 'space-y-3'}>
      {!compact ? (
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <MailCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>{t('newsletterTitle')}</span>
          </h3>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{t('newsletterDesc')}</p>
        </div>
      ) : null}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          aria-label="Newsletter email address"
          className="h-9 text-xs sm:w-64"
        />
        <Button type="submit" size="sm" disabled={submitting} className="whitespace-nowrap shrink-0">
          {submitting ? 'Saving...' : t('subscribeBtn')}
        </Button>
      </div>
    </form>
  );
}
