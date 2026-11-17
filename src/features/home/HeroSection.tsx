import { motion } from 'motion/react';
import { ArrowDownRight, Download, Github, Linkedin, Mail, MapPin } from 'lucide-react';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { Button } from '@/src/components/ui/Button';
import { SafeImage } from '@/src/components/common/SafeImage';
import type { ProfileDto } from '@/src/types/portfolio';

export function HeroSection({ profile }: { profile: ProfileDto }) {
  const { t } = useLanguage();
  const scrollToContact = () => {
    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const metrics = [
    { label: 'Commercial Experience', value: profile.yearsExperienceLabel || '5+ Years' },
    { label: 'Verified Testing Impact', value: '25% Fewer Bugs' },
    { label: 'Base Location', value: 'Kathmandu, Nepal' },
  ];

  return (
    <section className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800/80">
      {/* Subtle architectural radial glow (compositor-friendly) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-0 h-[460px] w-[460px] rounded-full bg-blue-600/10 blur-3xl dark:bg-blue-500/10"
      />

      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
          {/* Left Column: Primary Typography & Actions */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 flex flex-col justify-between space-y-8"
          >
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                  <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  {profile.location}
                </span>
                <span aria-hidden="true">·</span>
                <span>{profile.headline}</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.08] text-zinc-900 dark:text-zinc-50 text-balance">
                {profile.fullName}
              </h1>

              <p className="text-lg sm:text-xl font-medium text-zinc-700 dark:text-zinc-300 leading-snug max-w-2xl text-balance">
                {profile.tagline}
              </p>

              <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
                {profile.careerObjective}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={scrollToContact}>
                  <span>{t('contactMe')}</span>
                  <ArrowDownRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href={profile.cvUrl} download="Pramesh_Bhattarai_Resume.pdf">
                    <Download className="h-4 w-4" />
                    <span>{t('downloadCv')}</span>
                  </a>
                </Button>
              </div>

              {/* Verified Social & Contact Links */}
              <div className="flex flex-wrap items-center gap-5 pt-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                  <span>LinkedIn</span>
                </a>
                <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">/</span>
                <a
                  href={profile.githubPrimaryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Github className="h-4 w-4" />
                  <span>github.com/prameshbhattaraiofficial</span>
                </a>
                <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">/</span>
                <a
                  href={profile.githubSecondaryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Github className="h-4 w-4" />
                  <span>github.com/codingwithpramesh</span>
                </a>
                <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">/</span>
                <a
                  href={`mailto:${profile.email}`}
                  className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span>{profile.email}</span>
                </a>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Matching-Height Portrait Frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
            className="lg:col-span-5"
          >
            <div className="relative h-80 sm:h-96 lg:h-full min-h-[340px] w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#111114]">
              <SafeImage
                src={profile.avatarUrl}
                alt={`Portrait of ${profile.fullName}`}
                fallbackTitle={profile.fullName}
                fallbackSubtitle={profile.headline}
                className="h-full w-full"
                imgClassName="h-full w-full object-cover object-top"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-6">
                <p className="text-xs font-mono text-zinc-300">{profile.availability}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Full-Width 3-Column Verified Career Strip */}
        <div className="mt-12 grid grid-cols-1 gap-6 border-t border-zinc-200 dark:border-zinc-800/80 pt-8 sm:grid-cols-3 lg:gap-8">
          {metrics.map((m) => (
            <div key={m.label}>
              <p className="font-mono text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums">
                {m.value}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
