import { Award, ExternalLink, Trophy } from 'lucide-react';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { SectionHeading } from '@/src/components/common/SectionHeading';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import type { AchievementDto, CertificationDto } from '@/src/types/portfolio';

export function AchievementsSection({
  achievements,
  certifications,
}: {
  achievements: AchievementDto[];
  certifications: CertificationDto[];
}) {
  const { t } = useLanguage();

  if (achievements.length === 0 && certifications.length === 0) {
    return null;
  }

  return (
    <section id="achievements" className="scroll-mt-20 border-b border-zinc-200 dark:border-zinc-800/80 py-20">
      <div className="mx-auto max-w-6xl px-6 space-y-12">
        <SectionHeading
          indexLabel="05."
          title={t('achievementsTitle')}
          description="Measured engineering milestones, academic distinctions, and verified technical training."
        />

        {achievements.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Engineering &amp; Academic Milestones
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {achievements.map((ach) => (
                <Card key={ach.id} className="flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-blue-600 dark:text-blue-400">
                          <Trophy className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {ach.category} <span aria-hidden="true">·</span> {ach.organization}
                          </p>
                          <h4 className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            {ach.title}
                          </h4>
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs tabular-nums shrink-0">
                        <p className="text-zinc-500 dark:text-zinc-400">{ach.achievedDate}</p>
                        {ach.metricLabel ? (
                          <p className="mt-1 font-semibold text-blue-600 dark:text-blue-400">{ach.metricLabel}</p>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{ach.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {certifications.length > 0 ? (
          <div id="certifications" className="scroll-mt-20 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Certifications &amp; Technical Training
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {certifications.map((cert) => (
                <Card key={cert.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-blue-600 dark:text-blue-400">
                          <Award className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{cert.title}</h4>
                          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{cert.issuer}</p>
                          {cert.duration ? (
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              Duration: {cert.duration}
                            </p>
                          ) : null}
                          {cert.credentialUrl ? (
                            <a
                              href={cert.credentialUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <span>Verify Credential</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                        <p>{cert.issueDate}</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
