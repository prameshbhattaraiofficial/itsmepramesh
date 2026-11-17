import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { SectionHeading } from '@/src/components/common/SectionHeading';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import type { ServiceDto } from '@/src/types/portfolio';

export function ServicesSection({ services }: { services: ServiceDto[] }) {
  const { t } = useLanguage();
  return (
    <section id="services" className="border-b border-zinc-200 dark:border-zinc-800/80 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          indexLabel="07."
          title={t('servicesTitle')}
          description="Practical software engineering engagements aligned with my production experience in .NET, SQL, and full-stack web delivery."
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {services.map((service, idx) => (
            <Card key={service.id}>
              <CardHeader className="pb-3">
                <p className="font-mono text-xs text-blue-600 dark:text-blue-400 tabular-nums">
                  {String(idx + 1).padStart(2, '0')}
                </p>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{service.title}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {service.shortDescription}
                </p>
              </CardHeader>
              {service.deliverables.length > 0 ? (
                <CardContent>
                  <ul className="space-y-1.5 border-t border-zinc-100 dark:border-zinc-800/80 pt-4 text-sm text-zinc-700 dark:text-zinc-300 list-disc pl-5">
                    {service.deliverables.map((d, i) => (
                      <li key={i}>{d}</li>
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
