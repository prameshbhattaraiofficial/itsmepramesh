import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { SectionHeading } from '@/src/components/common/SectionHeading';
import type { ProfileDto } from '@/src/types/portfolio';

interface LanguageEntry {
  language: string;
  reading: string;
  speaking: string;
  writing: string;
  listening: string;
}

export function AboutSection({ profile }: { profile: ProfileDto }) {
  const { t } = useLanguage();
  let languages: LanguageEntry[] = [];
  try {
    languages = JSON.parse(profile.languagesJson || '[]');
  } catch {
    languages = [];
  }

  return (
    <section id="about" className="border-b border-zinc-200 dark:border-zinc-800/80 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading
              indexLabel="01."
              title={t('aboutMeTitle')}
              description="Software architecture, clean REST APIs, and hands-on mentorship grounded in production delivery."
            />
          </div>

          <div className="lg:col-span-7">
            <p className="text-base sm:text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
              {profile.bio}
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Languages &amp; Engagement</h3>
          <div className="mt-2 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <p>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">Availability:</span>{' '}
              {profile.availability}
            </p>
            <p>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">Languages:</span>{' '}
              {languages.map((l) => `${l.language} (${l.speaking})`).join(' · ') || 'English · Nepali'}
            </p>
            <p>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">Location:</span>{' '}
              {profile.location}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
