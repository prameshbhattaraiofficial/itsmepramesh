import { GraduationCap } from 'lucide-react';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { SectionHeading } from '@/src/components/common/SectionHeading';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import type { EducationDto } from '@/src/types/portfolio';

export function EducationSection({
  education,
}: {
  education: EducationDto[];
}) {
  const { t } = useLanguage();

  return (
    <section id="education" className="border-b border-zinc-200 dark:border-zinc-800/80 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          indexLabel="04."
          title={t('educationTitle')}
          description="Academic foundation in information technology completed alongside full-time software engineering."
        />

        <div className={`mt-12 grid grid-cols-1 gap-6 ${education.length > 1 ? 'lg:grid-cols-2' : 'lg:max-w-3xl'}`}>
          {education.map((edu) => (
            <Card key={edu.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-blue-600 dark:text-blue-400">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{edu.degree}</h3>
                      <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{edu.institution}</p>
                      {edu.affiliatedUniversity ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Affiliated with {edu.affiliatedUniversity}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                    <p>{edu.graduationYear}</p>
                    {edu.grade ? (
                      <p className="mt-1 font-semibold text-blue-600 dark:text-blue-400">{edu.grade}</p>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              {edu.highlights.length > 0 ? (
                <CardContent>
                  <ul className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400 list-disc pl-5">
                    {edu.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
