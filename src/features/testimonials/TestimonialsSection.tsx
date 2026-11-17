import { Mail, MapPin, Phone, Quote } from 'lucide-react';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { SectionHeading } from '@/src/components/common/SectionHeading';
import { Card, CardContent } from '@/src/components/ui/Card';
import type { ProfileDto, TestimonialDto } from '@/src/types/portfolio';

export function TestimonialsSection({
  testimonials,
  profile,
}: {
  testimonials: TestimonialDto[];
  profile: ProfileDto;
}) {
  const { lang, t } = useLanguage();
  const publishedEndorsements = testimonials.filter((item) => !item.isPlaceholder);

  return (
    <section id="testimonials" className="border-b border-zinc-200 dark:border-zinc-800/80 py-20">
      <div className="mx-auto max-w-6xl px-6 space-y-12">
        <SectionHeading
          indexLabel="09."
          title={lang === 'ne' || publishedEndorsements.length > 0 ? t('testimonialsTitle') : 'Professional Reference'}
          description={
            publishedEndorsements.length > 0
              ? 'Endorsements from engineering colleagues and project leads alongside verified workplace references.'
              : 'Verified workplace reference from current engineering engagement.'
          }
        />

        {publishedEndorsements.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {publishedEndorsements.map((t) => (
              <Card key={t.id} className="flex flex-col justify-between">
                <CardContent className="p-6 sm:p-7 flex flex-col justify-between h-full">
                  <div>
                    <Quote className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                      “{t.quote}”
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{t.authorName}</p>
                    <p className="mt-0.5">
                      {t.authorRole} <span aria-hidden="true">·</span> {t.organization}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {/* Verified Workplace Reference */}
        <div id="references" className="lg:max-w-2xl">
          <Card>
            <CardContent className="p-6 sm:p-7 space-y-5">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Verified Workplace Reference
                </p>
                <h3 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {profile.referenceName}
                </h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{profile.referenceRole}</p>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-4 space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span>Radhe Radhe Bhaktapur, Nepal</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="font-mono tabular-nums space-y-1">
                    <p>{profile.referencePhone}</p>
                    <p>1660-016-2000 (NTC Toll Free) · 18102335133 (NCELL Toll Free)</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <a
                    href="mailto:info@mypay.com.np"
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    info@mypay.com.np
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
