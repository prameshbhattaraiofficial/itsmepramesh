import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { CheckCircle2, Github, Linkedin, Mail, MapPin, Phone, PhoneCall, Send } from 'lucide-react';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import { SectionHeading } from '@/src/components/common/SectionHeading';
import { Button } from '@/src/components/ui/Button';
import { Input, Textarea } from '@/src/components/ui/Input';
import type { ProfileDto } from '@/src/types/portfolio';

const contactFormSchema = z.object({
  senderName: z.string().trim().min(2, 'Please enter your name (at least 2 characters).'),
  senderEmail: z.string().trim().email('Please enter a valid email address.'),
  subject: z.string().trim().min(2, 'Please provide a brief subject.'),
  message: z.string().trim().min(5, 'Message must be at least 5 characters.'),
});

export function ContactSection({ profile }: { profile: ProfileDto }) {
  const { t } = useLanguage();
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState<{
    message: string;
    senderName: string;
    subject: string;
    body: string;
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const parsed = contactFormSchema.safeParse({ senderName, senderEmail, subject, message });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] || 'form');
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await portfolioApi.submitContact(parsed.data);
      toast.success(res.message);
      setSentConfirmation({
        message: res.message,
        senderName: parsed.data.senderName,
        subject: parsed.data.subject,
        body: parsed.data.message,
      });
      setSenderName('');
      setSenderEmail('');
      setSubject('');
      setMessage('');
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
        ?.response?.data;
      if (errData?.errors) {
        const serverErrs: Record<string, string> = {};
        for (const [k, msgs] of Object.entries(errData.errors)) {
          if (Array.isArray(msgs) && msgs[0]) serverErrs[k] = msgs[0];
        }
        setFieldErrors(serverErrs);
      }
      const msg = errData?.message || 'Unable to send message right now. Please try emailing directly.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Contact Details */}
          <div className="lg:col-span-5 space-y-8">
            <SectionHeading
              indexLabel="10."
              title={t('contactTitle')}
              description="Available for full-time .NET engineering roles, freelance API architecture, and technical consulting."
            />

            <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">Email</p>
                  <a href={`mailto:${profile.email}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {profile.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">Phone</p>
                  <p className="font-mono text-xs tabular-nums">
                    {profile.phonePrimary} · {profile.phoneSecondary}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">Location</p>
                  <p>{profile.location}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://wa.me/${(profile.phonePrimary || '9779863439135').replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <PhoneCall className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('whatsappChat')}</span>
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={profile.linkedinUrl} target="_blank" rel="noreferrer">
                  <Linkedin className="h-4 w-4" />
                  <span>LinkedIn</span>
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={profile.githubPrimaryUrl} target="_blank" rel="noreferrer">
                  <Github className="h-4 w-4" />
                  <span>GitHub</span>
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={profile.githubSecondaryUrl} target="_blank" rel="noreferrer">
                  <Github className="h-4 w-4" />
                  <span>CodingWithPramesh</span>
                </a>
              </Button>
            </div>
          </div>

          {/* Validated Contact Form */}
          <div className="lg:col-span-7">
            {sentConfirmation ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/90 bg-white dark:bg-[#111114] p-6 sm:p-8 space-y-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Message Received</h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{sentConfirmation.message}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 dark:border-zinc-800/80 pt-5">
                  <Button type="button" size="sm" onClick={() => setSentConfirmation(null)}>
                    Send Another Message
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`mailto:${profile.email}?subject=${encodeURIComponent(
                        sentConfirmation.subject
                      )}&body=${encodeURIComponent(
                        `Hi ${profile.fullName},\n\n${sentConfirmation.body}\n\n— ${sentConfirmation.senderName}`
                      )}`}
                    >
                      <Mail className="h-4 w-4" />
                      <span>Also Open in Email App</span>
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="rounded-xl border border-zinc-200 dark:border-zinc-800/90 bg-white dark:bg-[#111114] p-6 sm:p-8 space-y-5"
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Your Name
                    </label>
                    <Input
                      id="contact-name"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                    />
                    {fieldErrors.senderName ? (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors.senderName}</p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Email Address
                    </label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="jane@company.com"
                      required
                    />
                    {fieldErrors.senderEmail ? (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors.senderEmail}</p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Subject
                  </label>
                  <Input
                    id="contact-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="API Architecture / Full-Stack Opportunity"
                    required
                  />
                  {fieldErrors.subject ? (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.subject}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Message
                  </label>
                  <Textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell me about your project, role, or engineering challenge..."
                    required
                  />
                  {fieldErrors.message ? (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.message}</p>
                  ) : null}
                </div>

                <div className="flex items-center justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    <Send className="h-4 w-4" />
                    <span>{isSubmitting ? 'Sending...' : t('sendMessage')}</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
