import { Link } from 'react-router-dom';
import { Github, Linkedin, Mail, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { NewsletterForm } from '@/src/components/common/NewsletterForm';
import type { ProfileDto } from '@/src/types/portfolio';

export function Footer({ profile }: { profile?: ProfileDto }) {
  const year = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-[#050505]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {profile?.fullName || 'Pramesh Bhattarai'}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {profile?.location || 'Kapan, Kathmandu, Nepal'} · {profile?.headline || 'Full-Stack Software Engineer'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {profile?.linkedinUrl ? (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors whitespace-nowrap"
              >
                <Linkedin className="h-3.5 w-3.5" />
                <span>LinkedIn</span>
              </a>
            ) : null}
            {profile?.githubPrimaryUrl ? (
              <a
                href={profile.githubPrimaryUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors whitespace-nowrap"
              >
                <Github className="h-3.5 w-3.5" />
                <span>GitHub</span>
              </a>
            ) : null}
            {profile?.email ? (
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors whitespace-nowrap"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Email</span>
              </a>
            ) : null}
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{t('portalLogin')}</span>
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-200/70 dark:border-zinc-800/70 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-500">
          <p>
            © {year} {profile?.fullName || 'Pramesh Bhattarai'}. {t('allRightsReserved')}
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
              {t('newsletterTitle')}:
            </span>
            <NewsletterForm compact />
          </div>
        </div>
      </div>
    </footer>
  );
}
