import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { SectionHeading } from '@/src/components/common/SectionHeading';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import type { SkillCategoryDto } from '@/src/types/portfolio';

export function SkillsSection({ categories }: { categories: SkillCategoryDto[] }) {
  const { t } = useLanguage();

  return (
    <section id="skills" className="border-b border-zinc-200 dark:border-zinc-800/80 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          indexLabel="02."
          title={t('skillsTitle')}
          description="Core technologies, frameworks, database systems, and engineering practices verified across my resume."
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{cat.name}</h3>
                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                    {cat.skills.length} skills
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {cat.skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 border-t border-zinc-100 dark:border-zinc-800/80 pt-3 first:border-t-0 first:pt-0"
                  >
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{skill.name}</span>
                    {skill.description ? (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 sm:text-right max-w-sm">
                        {skill.description}
                      </span>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
