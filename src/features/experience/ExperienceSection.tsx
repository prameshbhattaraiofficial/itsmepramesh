import { motion } from 'motion/react';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { SectionHeading } from '@/src/components/common/SectionHeading';
import type { ExperienceDto } from '@/src/types/portfolio';

export function ExperienceSection({ experiences }: { experiences: ExperienceDto[] }) {
  const { t } = useLanguage();

  return (
    <section id="experience" className="border-b border-zinc-200 dark:border-zinc-800/80 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          indexLabel="03."
          title={t('experienceTitle')}
          description="Chronological engineering track record spanning enterprise .NET web services, SQL optimization, and client delivery."
        />

        <div className="relative mt-12 space-y-10 pl-6 sm:pl-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800">
          {experiences.map((exp, idx) => (
            <motion.article
              key={exp.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              className="relative rounded-xl border border-zinc-200 dark:border-zinc-800/90 bg-white dark:bg-[#111114] p-6 sm:p-7"
            >
              {/* Timeline marker */}
              <span
                aria-hidden="true"
                className="absolute -left-[22px] sm:-left-[30px] top-7 h-3 w-3 rounded-full border-2 border-blue-600 dark:border-blue-400 bg-zinc-50 dark:bg-[#050505]"
              />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{exp.position}</h3>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{exp.company}</p>
                </div>
                <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 sm:text-right tabular-nums">
                  <p>
                    {exp.startDate} — {exp.endDate || 'Present'}
                  </p>
                  <p className="mt-0.5">
                    {exp.durationLabel} · {exp.location}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{exp.summary}</p>

              {exp.responsibilities.length > 0 ? (
                <ul className="mt-4 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400 list-disc pl-5">
                  {exp.responsibilities.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : null}

              {exp.achievements.length > 0 ? (
                <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">Verified Outcomes</p>
                  <ul className="mt-1.5 space-y-1 text-sm text-zinc-700 dark:text-zinc-300 list-disc pl-5">
                    {exp.achievements.map((ach, i) => (
                      <li key={i}>{ach}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {exp.technologies.length > 0 ? (
                <p className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {exp.technologies.join(' · ')}
                </p>
              ) : null}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
