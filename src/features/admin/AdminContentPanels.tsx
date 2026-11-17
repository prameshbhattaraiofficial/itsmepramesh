import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Database, Download, ExternalLink, KeyRound, Mail, Pencil, Plus, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { adminApi } from '@/src/services/api/adminApi';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import { Input, PasswordInput, Textarea } from '@/src/components/ui/Input';
import { Switch } from '@/src/components/ui/SwitchAndSkeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/Dialog';
import type {
  AchievementDto,
  BlogPostDto,
  CertificationDto,
  ContactMessageDto,
  EducationDto,
  MediaFileDto,
  ServiceDto,
  TestimonialDto,
} from '@/src/types/portfolio';

function invalidateAllPortfolioQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['admin-overview'] });
  qc.invalidateQueries({ queryKey: ['education'] });
  qc.invalidateQueries({ queryKey: ['achievements'] });
  qc.invalidateQueries({ queryKey: ['services'] });
  qc.invalidateQueries({ queryKey: ['testimonials'] });
  qc.invalidateQueries({ queryKey: ['admin-blog'] });
  qc.invalidateQueries({ queryKey: ['blog'] });
}

export function CredentialsAdminPanel({
  education,
  certifications,
  achievements,
}: {
  education: EducationDto[];
  certifications: CertificationDto[];
  achievements: AchievementDto[];
}) {
  const qc = useQueryClient();

  // --- Education Dialog State ---
  const [eduOpen, setEduOpen] = useState(false);
  const [editingEduId, setEditingEduId] = useState<number | null>(null);
  const [eduDegree, setEduDegree] = useState('');
  const [eduInstitution, setEduInstitution] = useState('');
  const [eduUniversity, setEduUniversity] = useState('');
  const [eduGradYear, setEduGradYear] = useState('');
  const [eduGrade, setEduGrade] = useState('');
  const [eduHighlights, setEduHighlights] = useState('');
  const [eduOrder, setEduOrder] = useState('0');

  const openEduCreate = () => {
    setEditingEduId(null);
    setEduDegree('');
    setEduInstitution('');
    setEduUniversity('');
    setEduGradYear('');
    setEduGrade('');
    setEduHighlights('');
    setEduOrder(String(education.length + 1));
    setEduOpen(true);
  };

  const openEduEdit = (item: EducationDto) => {
    setEditingEduId(item.id);
    setEduDegree(item.degree);
    setEduInstitution(item.institution);
    setEduUniversity(item.affiliatedUniversity || '');
    setEduGradYear(item.graduationYear);
    setEduGrade(item.grade || '');
    setEduHighlights(item.highlights.join('\n'));
    setEduOrder(String(item.displayOrder));
    setEduOpen(true);
  };

  const saveEducation = useMutation({
    mutationFn: () => {
      const payload = {
        degree: eduDegree,
        institution: eduInstitution,
        affiliatedUniversity: eduUniversity || null,
        graduationYear: eduGradYear,
        grade: eduGrade || null,
        highlights: eduHighlights
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        displayOrder: Number(eduOrder) || 0,
      };
      return editingEduId
        ? adminApi.updateEducation(editingEduId, payload)
        : adminApi.createEducation(payload);
    },
    onSuccess: () => {
      invalidateAllPortfolioQueries(qc);
      toast.success(editingEduId ? 'Education updated.' : 'Education entry added.');
      setEduOpen(false);
    },
    onError: () => toast.error('Could not save education record. Check required fields.'),
  });

  const deleteEducation = useMutation({
    mutationFn: (id: number) => adminApi.deleteEducation(id),
    onSuccess: () => {
      invalidateAllPortfolioQueries(qc);
      toast.success('Education entry removed.');
    },
  });

  // --- Certifications Dialog State ---
  const [certOpen, setCertOpen] = useState(false);
  const [editingCertId, setEditingCertId] = useState<number | null>(null);
  const [certTitle, setCertTitle] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certDate, setCertDate] = useState('');
  const [certDuration, setCertDuration] = useState('');
  const [certUrl, setCertUrl] = useState('');
  const [certOrder, setCertOrder] = useState('0');

  const openCertCreate = () => {
    setEditingCertId(null);
    setCertTitle('');
    setCertIssuer('');
    setCertDate('');
    setCertDuration('');
    setCertUrl('');
    setCertOrder(String(certifications.length + 1));
    setCertOpen(true);
  };

  const openCertEdit = (c: CertificationDto) => {
    setEditingCertId(c.id);
    setCertTitle(c.title);
    setCertIssuer(c.issuer);
    setCertDate(c.issueDate);
    setCertDuration(c.duration || '');
    setCertUrl(c.credentialUrl || '');
    setCertOrder(String(c.displayOrder));
    setCertOpen(true);
  };

  const saveCertification = useMutation({
    mutationFn: () => {
      const payload = {
        title: certTitle,
        issuer: certIssuer,
        issueDate: certDate,
        duration: certDuration || null,
        credentialUrl: certUrl || null,
        displayOrder: Number(certOrder) || 0,
      };
      return editingCertId
        ? adminApi.updateCertification(editingCertId, payload)
        : adminApi.createCertification(payload);
    },
    onSuccess: () => {
      invalidateAllPortfolioQueries(qc);
      toast.success(editingCertId ? 'Certification updated.' : 'Certification added.');
      setCertOpen(false);
    },
    onError: () => toast.error('Could not save certification.'),
  });

  const deleteCertification = useMutation({
    mutationFn: (id: number) => adminApi.deleteCertification(id),
    onSuccess: () => {
      invalidateAllPortfolioQueries(qc);
      toast.success('Certification removed.');
    },
  });

  // --- Achievements Dialog State ---
  const [achOpen, setAchOpen] = useState(false);
  const [editingAchId, setEditingAchId] = useState<number | null>(null);
  const [achTitle, setAchTitle] = useState('');
  const [achCategory, setAchCategory] = useState('Engineering Quality');
  const [achMetric, setAchMetric] = useState('');
  const [achOrg, setAchOrg] = useState('');
  const [achDate, setAchDate] = useState('');
  const [achDesc, setAchDesc] = useState('');
  const [achOrder, setAchOrder] = useState('0');

  const openAchCreate = () => {
    setEditingAchId(null);
    setAchTitle('');
    setAchCategory('Engineering Quality');
    setAchMetric('');
    setAchOrg('');
    setAchDate('');
    setAchDesc('');
    setAchOrder(String(achievements.length + 1));
    setAchOpen(true);
  };

  const openAchEdit = (a: AchievementDto) => {
    setEditingAchId(a.id);
    setAchTitle(a.title);
    setAchCategory(a.category);
    setAchMetric(a.metricLabel || '');
    setAchOrg(a.organization);
    setAchDate(a.achievedDate);
    setAchDesc(a.description);
    setAchOrder(String(a.displayOrder));
    setAchOpen(true);
  };

  const saveAchievement = useMutation({
    mutationFn: () => {
      const payload = {
        title: achTitle,
        category: achCategory,
        metricLabel: achMetric || null,
        organization: achOrg,
        achievedDate: achDate,
        description: achDesc,
        displayOrder: Number(achOrder) || 0,
      };
      return editingAchId
        ? adminApi.updateAchievement(editingAchId, payload)
        : adminApi.createAchievement(payload);
    },
    onSuccess: () => {
      invalidateAllPortfolioQueries(qc);
      toast.success(editingAchId ? 'Achievement updated.' : 'Achievement added.');
      setAchOpen(false);
    },
    onError: () => toast.error('Could not save achievement. Check required fields.'),
  });

  const deleteAchievement = useMutation({
    mutationFn: (id: number) => adminApi.deleteAchievement(id),
    onSuccess: () => {
      invalidateAllPortfolioQueries(qc);
      toast.success('Achievement removed.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Education CRUD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Education</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Manage degrees, institutions, GPA/grades, and academic highlights.
            </p>
          </div>
          <Button size="sm" onClick={openEduCreate}>
            <Plus className="h-4 w-4" />
            <span>Add Education</span>
          </Button>
        </CardHeader>
        <CardContent>
          {education.length === 0 ? (
            <p className="text-sm text-zinc-500">No education entries yet.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {education.map((e) => (
                <div key={e.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                  <div>
                    <p className="text-sm font-semibold">{e.degree}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {e.institution}
                      {e.affiliatedUniversity ? ` · ${e.affiliatedUniversity}` : ''} · {e.graduationYear}
                      {e.grade ? ` · ${e.grade}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEduEdit(e)}>
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteEducation.mutate(e.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certifications CRUD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Certifications &amp; Training</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Manage professional certificates, issuers, dates, and credential verification links.
            </p>
          </div>
          <Button size="sm" onClick={openCertCreate}>
            <Plus className="h-4 w-4" />
            <span>Add Certification</span>
          </Button>
        </CardHeader>
        <CardContent>
          {certifications.length === 0 ? (
            <p className="text-sm text-zinc-500">No certifications added yet.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {certifications.map((c) => (
                <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                  <div>
                    <p className="text-sm font-semibold">{c.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {c.issuer} · {c.issueDate}
                      {c.duration ? ` · ${c.duration}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openCertEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteCertification.mutate(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievements CRUD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Achievements &amp; Milestones</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Highlight measurable engineering wins, awards, and impact metrics.
            </p>
          </div>
          <Button size="sm" onClick={openAchCreate}>
            <Plus className="h-4 w-4" />
            <span>Add Achievement</span>
          </Button>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
            <p className="text-sm text-zinc-500">No achievements added yet.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {achievements.map((a) => (
                <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                  <div>
                    <p className="text-sm font-semibold">{a.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {a.category} · {a.organization} · {a.achievedDate}
                      {a.metricLabel ? ` · ${a.metricLabel}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openAchEdit(a)}>
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteAchievement.mutate(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Education Dialog */}
      <Dialog open={eduOpen} onOpenChange={setEduOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEduId ? 'Edit Education' : 'Add Education'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveEducation.mutate();
            }}
            className="space-y-4 mt-3"
          >
            <div>
              <label className="text-xs font-medium block mb-1">Degree / Program *</label>
              <Input value={eduDegree} onChange={(e) => setEduDegree(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium block mb-1">Institution *</label>
                <Input value={eduInstitution} onChange={(e) => setEduInstitution(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Affiliated University</label>
                <Input value={eduUniversity} onChange={(e) => setEduUniversity(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Graduation Year *</label>
                <Input value={eduGradYear} onChange={(e) => setEduGradYear(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Grade / CGPA</label>
                <Input value={eduGrade} onChange={(e) => setEduGrade(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Highlights (one per line)</label>
              <Textarea
                className="min-h-[80px]"
                value={eduHighlights}
                onChange={(e) => setEduHighlights(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="w-28">
                <label className="text-xs font-medium block mb-1">Sort Order</label>
                <Input type="number" value={eduOrder} onChange={(e) => setEduOrder(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEduOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saveEducation.isPending}>
                  {saveEducation.isPending ? 'Saving...' : 'Save Education'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Certification Dialog */}
      <Dialog open={certOpen} onOpenChange={setCertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCertId ? 'Edit Certification' : 'Add Certification'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveCertification.mutate();
            }}
            className="space-y-4 mt-3"
          >
            <div>
              <label className="text-xs font-medium block mb-1">Certification Title *</label>
              <Input value={certTitle} onChange={(e) => setCertTitle(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium block mb-1">Issuer *</label>
                <Input value={certIssuer} onChange={(e) => setCertIssuer(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Issue Date *</label>
                <Input value={certDate} onChange={(e) => setCertDate(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Duration (optional)</label>
                <Input value={certDuration} onChange={(e) => setCertDuration(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Sort Order</label>
                <Input type="number" value={certOrder} onChange={(e) => setCertOrder(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Credential URL (optional)</label>
              <Input value={certUrl} onChange={(e) => setCertUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCertOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveCertification.isPending}>
                {saveCertification.isPending ? 'Saving...' : 'Save Certification'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Achievement Dialog */}
      <Dialog open={achOpen} onOpenChange={setAchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAchId ? 'Edit Achievement' : 'Add Achievement'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveAchievement.mutate();
            }}
            className="space-y-4 mt-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium block mb-1">Achievement Title *</label>
                <Input value={achTitle} onChange={(e) => setAchTitle(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Category *</label>
                <Input value={achCategory} onChange={(e) => setAchCategory(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Organization *</label>
                <Input value={achOrg} onChange={(e) => setAchOrg(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Date / Period *</label>
                <Input value={achDate} onChange={(e) => setAchDate(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Highlight Metric</label>
                <Input value={achMetric} onChange={(e) => setAchMetric(e.target.value)} placeholder="e.g. 25% Fewer Bugs" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Sort Order</label>
                <Input type="number" value={achOrder} onChange={(e) => setAchOrder(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Impact Description *</label>
              <Textarea className="min-h-[80px]" value={achDesc} onChange={(e) => setAchDesc(e.target.value)} required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAchOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveAchievement.isPending}>
                {saveAchievement.isPending ? 'Saving...' : 'Save Achievement'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ServicesTestimonialsBlogPanel({
  services,
  testimonials,
  blogPosts,
}: {
  services: ServiceDto[];
  testimonials: TestimonialDto[];
  blogPosts: BlogPostDto[];
}) {
  const qc = useQueryClient();

  // --- Services Dialog State ---
  const [svcOpen, setSvcOpen] = useState(false);
  const [editingSvcId, setEditingSvcId] = useState<number | null>(null);
  const [svcTitle, setSvcTitle] = useState('');
  const [svcDesc, setSvcDesc] = useState('');
  const [svcDeliverables, setSvcDeliverables] = useState('');
  const [svcOrder, setSvcOrder] = useState('0');

  const openSvcCreate = () => {
    setEditingSvcId(null);
    setSvcTitle('');
    setSvcDesc('');
    setSvcDeliverables('');
    setSvcOrder(String(services.length + 1));
    setSvcOpen(true);
  };

  const openSvcEdit = (s: ServiceDto) => {
    setEditingSvcId(s.id);
    setSvcTitle(s.title);
    setSvcDesc(s.shortDescription);
    setSvcDeliverables(s.deliverables.join('\n'));
    setSvcOrder(String(s.displayOrder));
    setSvcOpen(true);
  };

  const saveService = useMutation({
    mutationFn: () => {
      const payload = {
        title: svcTitle,
        shortDescription: svcDesc,
        deliverables: svcDeliverables
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        displayOrder: Number(svcOrder) || 0,
      };
      return editingSvcId ? adminApi.updateService(editingSvcId, payload) : adminApi.createService(payload);
    },
    onSuccess: () => {
      invalidateAllPortfolioQueries(qc);
      toast.success(editingSvcId ? 'Service updated.' : 'Service added.');
      setSvcOpen(false);
    },
    onError: () => toast.error('Could not save service. Ensure title and description are valid.'),
  });

  const deleteService = useMutation({
    mutationFn: (id: number) => adminApi.deleteService(id),
    onSuccess: () => {
      invalidateAllPortfolioQueries(qc);
      toast.success('Service removed.');
    },
  });

  // --- Testimonials Dialog State ---
  const [testOpen, setTestOpen] = useState(false);
  const [editingTestId, setEditingTestId] = useState<number | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState('');
  const [organization, setOrganization] = useState('');
  const [quote, setQuote] = useState('');
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const [testOrder, setTestOrder] = useState('0');

  const openTestCreate = () => {
    setEditingTestId(null);
    setAuthorName('');
    setAuthorRole('');
    setOrganization('');
    setQuote('');
    setIsPlaceholder(false);
    setTestOrder(String(testimonials.length + 1));
    setTestOpen(true);
  };

  const openTestEdit = (t: TestimonialDto) => {
    setEditingTestId(t.id);
    setAuthorName(t.authorName);
    setAuthorRole(t.authorRole);
    setOrganization(t.organization);
    setQuote(t.quote);
    setIsPlaceholder(t.isPlaceholder);
    setTestOrder(String(t.displayOrder));
    setTestOpen(true);
  };

  const saveTestimonial = useMutation({
    mutationFn: () => {
      const payload = {
        authorName,
        authorRole,
        organization,
        quote,
        isPlaceholder,
        displayOrder: Number(testOrder) || 0,
      };
      return editingTestId
        ? adminApi.updateTestimonial(editingTestId, payload)
        : adminApi.createTestimonial(payload);
    },
    onSuccess: () => {
      invalidateAllPortfolioQueries(qc);
      toast.success(editingTestId ? 'Testimonial updated.' : 'Testimonial added.');
      setTestOpen(false);
    },
    onError: () => toast.error('Could not save testimonial. Quote must be at least 10 characters.'),
  });

  const deleteTestimonial = useMutation({
    mutationFn: (id: number) => adminApi.deleteTestimonial(id),
    onSuccess: () => {
      invalidateAllPortfolioQueries(qc);
      toast.success('Testimonial removed.');
    },
  });

  // --- Blog Post Dialog State ---
  const [postOpen, setPostOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postCategory, setPostCategory] = useState('Architecture & .NET');
  const [postTags, setPostTags] = useState('C#, .NET Web API');
  const [postExcerpt, setPostExcerpt] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [postSeoTitle, setPostSeoTitle] = useState('');
  const [postSeoDesc, setPostSeoDesc] = useState('');
  const [postPublished, setPostPublished] = useState(true);

  const openPostCreate = () => {
    setEditingPostId(null);
    setPostTitle('');
    setPostCategory('Architecture & .NET');
    setPostTags('C#, .NET Web API');
    setPostExcerpt('');
    setPostContent('');
    setPostImageUrl('');
    setPostSeoTitle('');
    setPostSeoDesc('');
    setPostPublished(true);
    setPostOpen(true);
  };

  const openPostEdit = (p: BlogPostDto) => {
    setEditingPostId(p.id);
    setPostTitle(p.title);
    setPostCategory(p.categoryName);
    setPostTags(p.tags.join(', '));
    setPostExcerpt(p.excerpt);
    setPostContent(p.content);
    setPostImageUrl(p.featuredImageUrl || '');
    setPostSeoTitle(p.seoTitle || '');
    setPostSeoDesc(p.seoDescription || '');
    setPostPublished(p.published);
    setPostOpen(true);
  };

  const savePost = useMutation({
    mutationFn: () => {
      const payload = {
        title: postTitle,
        categoryName: postCategory.trim() || 'Architecture & .NET',
        tags: postTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        excerpt: postExcerpt,
        content: postContent,
        featuredImageUrl: postImageUrl || null,
        seoTitle: postSeoTitle || null,
        seoDescription: postSeoDesc || null,
        published: postPublished,
      };
      return editingPostId ? adminApi.updateBlogPost(editingPostId, payload) : adminApi.createBlogPost(payload);
    },
    onSuccess: () => {
      invalidateAllPortfolioQueries(qc);
      toast.success(editingPostId ? 'Article updated.' : 'Blog article saved.');
      setPostOpen(false);
    },
    onError: () => toast.error('Could not save article. Check title, excerpt (10+ chars), and body.'),
  });

  const togglePublish = useMutation({
    mutationFn: (p: BlogPostDto) => adminApi.updateBlogPost(p.id, { published: !p.published }),
    onSuccess: () => {
      invalidateAllPortfolioQueries(qc);
      toast.success('Post visibility updated.');
    },
  });

  const deletePost = useMutation({
    mutationFn: (id: number) => adminApi.deleteBlogPost(id),
    onSuccess: () => {
      invalidateAllPortfolioQueries(qc);
      toast.success('Article removed.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Services */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Engineering Services</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Add, edit, or remove consulting and engineering service offerings.
            </p>
          </div>
          <Button size="sm" onClick={openSvcCreate}>
            <Plus className="h-4 w-4" />
            <span>Add Service</span>
          </Button>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-sm text-zinc-500">No services listed yet.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {services.map((s) => (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                  <div>
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{s.shortDescription}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openSvcEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteService.mutate(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Testimonials */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Testimonials &amp; Endorsements</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Manage colleague, manager, and client endorsements shown on your portfolio.
            </p>
          </div>
          <Button size="sm" onClick={openTestCreate}>
            <Plus className="h-4 w-4" />
            <span>Add Testimonial</span>
          </Button>
        </CardHeader>
        <CardContent>
          {testimonials.length === 0 ? (
            <p className="text-sm text-zinc-500">No testimonials added yet.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {testimonials.map((t) => (
                <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {t.authorName}{' '}
                      <span className="text-xs font-normal text-zinc-500">
                        · {t.authorRole} at {t.organization}
                        {t.isPlaceholder ? ' · Template' : ''}
                      </span>
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-2xl mt-0.5">
                      “{t.quote}”
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openTestEdit(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteTestimonial.mutate(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blog Posts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Blogs &amp; Technical Articles</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Write, edit, publish/unpublish, and manage SEO for technical articles.
            </p>
          </div>
          <Button size="sm" onClick={openPostCreate}>
            <Plus className="h-4 w-4" />
            <span>New Article</span>
          </Button>
        </CardHeader>
        <CardContent>
          {blogPosts.length === 0 ? (
            <p className="text-sm text-zinc-500">No articles created yet.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {blogPosts.map((post) => (
                <div key={post.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                  <div>
                    <p className="text-sm font-semibold">{post.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {post.categoryName} · {post.published ? 'Published' : 'Draft'} · {post.tags.join(', ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => togglePublish.mutate(post)}>
                      {post.published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openPostEdit(post)}>
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deletePost.mutate(post.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Dialog */}
      <Dialog open={svcOpen} onOpenChange={setSvcOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSvcId ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveService.mutate();
            }}
            className="space-y-4 mt-3"
          >
            <div>
              <label className="text-xs font-medium block mb-1">Service Title *</label>
              <Input value={svcTitle} onChange={(e) => setSvcTitle(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Short Description *</label>
              <Textarea className="min-h-[80px]" value={svcDesc} onChange={(e) => setSvcDesc(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Deliverables (one per line)</label>
              <Textarea
                className="min-h-[90px]"
                value={svcDeliverables}
                onChange={(e) => setSvcDeliverables(e.target.value)}
                placeholder="Clean REST endpoints&#10;Automated unit tests"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="w-28">
                <label className="text-xs font-medium block mb-1">Sort Order</label>
                <Input type="number" value={svcOrder} onChange={(e) => setSvcOrder(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setSvcOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saveService.isPending}>
                  {saveService.isPending ? 'Saving...' : 'Save Service'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Testimonial Dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTestId ? 'Edit Testimonial' : 'Add Testimonial'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveTestimonial.mutate();
            }}
            className="space-y-4 mt-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium block mb-1">Author Name *</label>
                <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Role / Title *</label>
                <Input value={authorRole} onChange={(e) => setAuthorRole(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Organization *</label>
                <Input value={organization} onChange={(e) => setOrganization(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Sort Order</label>
                <Input type="number" value={testOrder} onChange={(e) => setTestOrder(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Quote *</label>
              <Textarea className="min-h-[100px]" value={quote} onChange={(e) => setQuote(e.target.value)} required />
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={isPlaceholder} onCheckedChange={setIsPlaceholder} />
                <span>Mark as Editable Template</span>
              </label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setTestOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saveTestimonial.isPending}>
                  {saveTestimonial.isPending ? 'Saving...' : 'Save Testimonial'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Blog Post Dialog */}
      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPostId ? 'Edit Article' : 'New Article'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              savePost.mutate();
            }}
            className="space-y-4 mt-3"
          >
            <div>
              <label className="text-xs font-medium block mb-1">Article Title *</label>
              <Input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium block mb-1">Category *</label>
                <Input value={postCategory} onChange={(e) => setPostCategory(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Tags (comma-separated)</label>
                <Input value={postTags} onChange={(e) => setPostTags(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Short Excerpt *</label>
              <Input value={postExcerpt} onChange={(e) => setPostExcerpt(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Article Body (Markdown) *</label>
              <Textarea
                rows={7}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="## Heading&#10;- Bullet item"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium block mb-1">Featured Image URL</label>
                <Input value={postImageUrl} onChange={(e) => setPostImageUrl(e.target.value)} placeholder="/uploads/..." />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">SEO Title</label>
                <Input value={postSeoTitle} onChange={(e) => setPostSeoTitle(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">SEO Description</label>
              <Input value={postSeoDesc} onChange={(e) => setPostSeoDesc(e.target.value)} />
            </div>
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={postPublished} onCheckedChange={setPostPublished} />
                <span>Published publicly</span>
              </label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setPostOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={savePost.isPending}>
                  {savePost.isPending ? 'Saving...' : 'Save Article'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function MessagesAndMediaPanel({
  messages,
  media,
}: {
  messages: ContactMessageDto[];
  media: MediaFileDto[];
}) {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read' | 'archived'>('all');
  const emailLogsQuery = useQuery({
    queryKey: ['admin-email-logs'],
    queryFn: adminApi.getEmailLogs,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'unread' | 'read' | 'archived' }) =>
      adminApi.updateMessageStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-messages'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success('Message status updated.');
    },
  });

  const deleteMsg = useMutation({
    mutationFn: (id: number) => adminApi.deleteMessage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-messages'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success('Message deleted.');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => adminApi.uploadMedia(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-media'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success('Media uploaded.');
    },
    onError: () => toast.error('Upload failed. Allowed: JPG, PNG, WebP, PDF (max 5MB).'),
  });

  const deleteMedia = useMutation({
    mutationFn: (id: number) => adminApi.deleteMedia(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-media'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success('Media deleted.');
    },
  });

  const handleFileChange = (e: FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (input.files?.[0]) {
      uploadMutation.mutate(input.files[0]);
      input.value = '';
    }
  };

  const filteredMessages = messages.filter((m) => (statusFilter === 'all' ? true : m.status === statusFilter));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Contact Messages Inbox</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Review, mark read/archived, reply via email, or remove inquiries.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 p-1 text-xs">
            {(['all', 'unread', 'read', 'archived'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-2.5 py-1 font-medium capitalize whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  statusFilter === st
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {filteredMessages.length === 0 ? (
            <p className="text-sm text-zinc-500">No messages match this filter.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredMessages.map((m) => (
                <div key={m.id} className="py-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {m.subject} ·{' '}
                        <span className="font-normal text-zinc-500">
                          {m.senderName} ({m.senderEmail})
                        </span>
                      </p>
                      <p className="font-mono text-[11px] text-zinc-500 tabular-nums mt-0.5">
                        Status: {m.status.toUpperCase()} · {m.createdAt}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`mailto:${m.senderEmail}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}>
                          <Mail className="h-3.5 w-3.5" />
                          <span>Reply</span>
                        </a>
                      </Button>
                      {m.status !== 'read' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: m.id, status: 'read' })}
                        >
                          Mark Read
                        </Button>
                      ) : null}
                      {m.status !== 'archived' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: m.id, status: 'archived' })}
                        >
                          Archive
                        </Button>
                      ) : null}
                      <Button variant="destructive" size="sm" onClick={() => deleteMsg.mutate(m.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{m.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Media Library</h2>
            <p className="text-xs text-zinc-500">Upload portrait photos, project/product covers, or a PDF CV.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 whitespace-nowrap shrink-0">
            <Upload className="h-4 w-4" />
            <span>{uploadMutation.isPending ? 'Uploading...' : 'Upload File'}</span>
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFileChange} className="hidden" />
          </label>
        </CardHeader>
        <CardContent>
          {media.length === 0 ? (
            <p className="text-sm text-zinc-500">No uploaded files yet.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {media.map((f) => {
                const isImage = f.mimeType.startsWith('image/');
                return (
                  <div key={f.id} className="flex flex-wrap items-center justify-between gap-4 py-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      {isImage ? (
                        <img
                          src={f.url}
                          alt={f.originalName}
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 rounded-md object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{f.originalName}</p>
                        <p className="font-mono text-zinc-500 truncate tabular-nums">
                          {f.url} · {(f.sizeBytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" asChild>
                        <a href={f.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Open</span>
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(f.url);
                          toast.success('Copied URL to clipboard.');
                        }}
                      >
                        Copy URL
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteMedia.mutate(f.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Transactional Email Dispatch Log</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Cart confirmation emails dispatched to user login emails and contact inquiries.
          </p>
        </CardHeader>
        <CardContent>
          {(emailLogsQuery.data || []).length === 0 ? (
            <p className="text-sm text-zinc-500">No transactional emails recorded yet.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {(emailLogsQuery.data || []).map((log) => (
                <div key={log.id} className="py-3 space-y-1 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {log.subject}{' '}
                      <span className="font-normal text-zinc-500">→ {log.recipientEmail}</span>
                    </p>
                    <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                      {log.eventType} · {log.deliveryStatus.toUpperCase()} ({log.provider}) · {log.createdAt}
                    </span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-line line-clamp-3">
                    {log.bodyText}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function SecuritySettingsCard() {
  const qc = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [downloadingBackup, setDownloadingBackup] = useState<string | null>(null);

  const securityQuery = useQuery({
    queryKey: ['admin-security-status'],
    queryFn: adminApi.getSecurityStatus,
  });

  const backupMutation = useMutation({
    mutationFn: () => adminApi.triggerBackup(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin-security-status'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success(`Database backup saved: ${res.backup.fileName}`);
    },
    onError: () => toast.error('Could not create database backup.'),
  });

  const mutation = useMutation({
    mutationFn: () => adminApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast.success('Administrator password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not update password.';
      toast.error(msg);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    mutation.mutate();
  };

  const handleDownloadBackup = async (fileName: string) => {
    setDownloadingBackup(fileName);
    try {
      await adminApi.downloadBackup(fileName);
      toast.success(`Downloaded ${fileName}`);
    } catch {
      toast.error('Could not download backup file.');
    } finally {
      setDownloadingBackup(null);
    }
  };

  const sec = securityQuery.data;
  const controlItems = sec
    ? [
        { label: 'RBAC & Ownership Verification', ok: sec.controls.roleBasedAccess },
        { label: 'Anti-Forgery (CSRF) Token Protection', ok: sec.controls.antiForgeryCsrf },
        { label: 'Private Non-Public PDF Book Storage', ok: sec.controls.privatePdfStorage },
        { label: 'Magic-Byte Upload Signature Check', ok: sec.controls.magicByteUploadValidation },
        { label: 'Idempotent Payment Processing', ok: sec.controls.idempotentPaymentProcessing },
        { label: 'Server-Side Price Calculation', ok: sec.controls.serverSidePriceValidation },
        { label: 'Rate Limiting & Account Lockout', ok: sec.controls.rateLimitingAndLockout },
        { label: 'Parameterized SQL Queries', ok: sec.controls.parameterizedSql },
        { label: 'HttpOnly Refresh Cookies', ok: sec.controls.httpOnlyRefreshCookies },
        { label: 'Automated Daily SQLite Backups', ok: sec.controls.automatedDailyBackups },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base font-semibold">Application Security &amp; Database Backup Strategy</h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Active hardening controls, automated daily SQLite online snapshots, and security event logs.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={backupMutation.isPending}
            onClick={() => backupMutation.mutate()}
          >
            <Database className="h-3.5 w-3.5" />
            <span>{backupMutation.isPending ? 'Creating Snapshot...' : 'Create Backup Now'}</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {controlItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {controlItems.map((ctrl) => (
                <div
                  key={ctrl.label}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs"
                >
                  <CheckCircle2
                    className={`h-3.5 w-3.5 shrink-0 ${
                      ctrl.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
                    }`}
                  />
                  <span className="text-zinc-700 dark:text-zinc-300">{ctrl.label}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                Database Snapshots ({sec?.backups.length || 0})
              </h3>
              {sec?.backups && sec.backups.length > 0 ? (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3">
                  {sec.backups.slice(0, 6).map((b) => (
                    <div key={b.fileName} className="flex items-center justify-between gap-2 py-2.5 text-xs">
                      <div className="min-w-0">
                        <p className="font-mono font-medium truncate text-zinc-800 dark:text-zinc-200">{b.fileName}</p>
                        <p className="text-[11px] font-mono text-zinc-500 tabular-nums">
                          {Math.max(1, Math.round(b.sizeBytes / 1024))} KB · {b.createdAt.slice(0, 19).replace('T', ' ')}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={downloadingBackup === b.fileName}
                        onClick={() => handleDownloadBackup(b.fileName)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{downloadingBackup === b.fileName ? '...' : 'Download'}</span>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No backup files yet.</p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                Recent Security Events ({sec?.securityLogs.length || 0})
              </h3>
              {sec?.securityLogs && sec.securityLogs.length > 0 ? (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 max-h-64 overflow-y-auto">
                  {sec.securityLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="py-2 text-xs space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-mono font-semibold ${
                            log.level === 'ERROR'
                              ? 'text-red-500'
                              : log.level === 'WARN'
                                ? 'text-amber-500'
                                : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {log.eventType}
                        </span>
                        <span className="font-mono text-[11px] text-zinc-500 tabular-nums">{log.createdAt}</span>
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-400">{log.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No security alerts recorded.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold">Administrator Password</h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Update your CMS login password. Minimum 8 characters recommended.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-medium block mb-1">Current Password</label>
              <PasswordInput
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">New Password</label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Confirm New Password</label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit" size="sm" disabled={mutation.isPending}>
                {mutation.isPending ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
