import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { adminApi } from '@/src/services/api/adminApi';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import { Input, Textarea } from '@/src/components/ui/Input';
import { Switch } from '@/src/components/ui/SwitchAndSkeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/Dialog';
import type {
  ExperienceDto,
  OrderDto,
  ProductDto,
  ProfileDto,
  ProjectDto,
  SkillCategoryDto,
  SkillItemDto,
  StoreOrderStatus,
} from '@/src/types/portfolio';

export function ProfileSettingsPanel({ profile }: { profile: ProfileDto }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    fullName: profile.fullName,
    headline: profile.headline,
    tagline: profile.tagline,
    bio: profile.bio,
    careerObjective: profile.careerObjective,
    email: profile.email,
    phonePrimary: profile.phonePrimary,
    phoneSecondary: profile.phoneSecondary,
    location: profile.location,
    permanentAddress: profile.permanentAddress,
    avatarUrl: profile.avatarUrl,
    cvUrl: profile.cvUrl,
    linkedinUrl: profile.linkedinUrl,
    githubPrimaryUrl: profile.githubPrimaryUrl,
    githubSecondaryUrl: profile.githubSecondaryUrl,
    availability: profile.availability,
    languagesJson: profile.languagesJson,
    referenceName: profile.referenceName,
    referenceRole: profile.referenceRole,
    referencePhone: profile.referencePhone,
    yearsExperienceLabel: profile.yearsExperienceLabel,
    blogEnabled: profile.blogEnabled,
    seoTitle: profile.seoTitle,
    seoDescription: profile.seoDescription,
  });

  const mutation = useMutation({
    mutationFn: () => adminApi.updateProfile(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success('Profile, reference, and SEO settings saved.');
    },
    onError: () => toast.error('Failed to save profile settings. Check required fields.'),
  });

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Profile, Contact, Reference &amp; SEO Settings</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Edit your public biography, career objective, social links, workplace reference, SEO metadata, and Blog visibility.
        </p>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <div>
              <p className="text-sm font-medium">Enable Public Blog Module</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                When disabled, Blog &amp; Articles links and sections are hidden from the public site.
              </p>
            </div>
            <Switch
              checked={form.blogEnabled}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, blogEnabled: checked }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium block mb-1">Full Name</label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Headline</label>
              <Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Public Email</label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Years Experience Label</label>
              <Input
                value={form.yearsExperienceLabel}
                onChange={(e) => setForm({ ...form, yearsExperienceLabel: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Primary Phone</label>
              <Input value={form.phonePrimary} onChange={(e) => setForm({ ...form, phonePrimary: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Secondary Phone</label>
              <Input value={form.phoneSecondary} onChange={(e) => setForm({ ...form, phoneSecondary: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Current Location</label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Permanent Address</label>
              <Input
                value={form.permanentAddress}
                onChange={(e) => setForm({ ...form, permanentAddress: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Availability</label>
              <Input value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Avatar Image URL</label>
              <Input value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Resume / CV PDF URL</label>
              <Input value={form.cvUrl} onChange={(e) => setForm({ ...form, cvUrl: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">LinkedIn URL</label>
              <Input value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Primary GitHub URL</label>
              <Input
                value={form.githubPrimaryUrl}
                onChange={(e) => setForm({ ...form, githubPrimaryUrl: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Secondary GitHub URL</label>
              <Input
                value={form.githubSecondaryUrl}
                onChange={(e) => setForm({ ...form, githubSecondaryUrl: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">Hero Tagline</label>
            <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} required />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium block mb-1">Biography</label>
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Career Objective</label>
              <Textarea
                value={form.careerObjective}
                onChange={(e) => setForm({ ...form, careerObjective: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 space-y-4">
            <h3 className="text-sm font-semibold">Workplace Reference (Testimonials Section)</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="text-xs font-medium block mb-1">Organization / Reference Name</label>
                <Input value={form.referenceName} onChange={(e) => setForm({ ...form, referenceName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Reference Title / Role</label>
                <Input value={form.referenceRole} onChange={(e) => setForm({ ...form, referenceRole: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Reference Phone(s)</label>
                <Input
                  value={form.referencePhone}
                  onChange={(e) => setForm({ ...form, referencePhone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 space-y-4">
            <h3 className="text-sm font-semibold">SEO &amp; Languages JSON</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium block mb-1">SEO Meta Title</label>
                <Input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Languages JSON</label>
                <Input
                  className="font-mono text-xs"
                  value={form.languagesJson}
                  onChange={(e) => setForm({ ...form, languagesJson: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">SEO Meta Description</label>
              <Textarea
                className="min-h-[80px]"
                value={form.seoDescription}
                onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save All Profile Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ProjectsAdminPanel({ projects }: { projects: ProjectDto[] }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Backend API');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [architectureNotes, setArchitectureNotes] = useState('');
  const [technologiesText, setTechnologiesText] = useState('C#, .NET Web API, SQL');
  const [githubUrl, setGithubUrl] = useState('');
  const [liveDemoUrl, setLiveDemoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [featured, setFeatured] = useState(true);
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const [displayOrder, setDisplayOrder] = useState('0');

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('Backend API');
    setShortDescription('');
    setFullDescription('');
    setArchitectureNotes('');
    setTechnologiesText('C#, .NET Web API, SQL');
    setGithubUrl('');
    setLiveDemoUrl('');
    setImageUrl('');
    setFeatured(true);
    setIsPlaceholder(false);
    setDisplayOrder(String(projects.length + 1));
  };

  const openEdit = (p: ProjectDto) => {
    setEditingId(p.id);
    setTitle(p.title);
    setCategory(p.category);
    setShortDescription(p.shortDescription);
    setFullDescription(p.fullDescription);
    setArchitectureNotes(p.architectureNotes);
    setTechnologiesText(p.technologies.join(', '));
    setGithubUrl(p.githubUrl || '');
    setLiveDemoUrl(p.liveDemoUrl || '');
    setImageUrl(p.imageUrl || '');
    setFeatured(p.featured);
    setIsPlaceholder(p.isPlaceholder);
    setDisplayOrder(String(p.displayOrder));
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title,
        category,
        shortDescription,
        fullDescription: fullDescription || shortDescription,
        architectureNotes,
        technologies: technologiesText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        githubUrl: githubUrl || null,
        liveDemoUrl: liveDemoUrl || null,
        imageUrl: imageUrl || null,
        isPlaceholder,
        featured,
        displayOrder: Number(displayOrder) || 0,
      };
      return editingId ? adminApi.updateProject(editingId, payload) : adminApi.createProject(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success(editingId ? 'Project updated.' : 'Project created.');
      setOpen(false);
      resetForm();
    },
    onError: () => toast.error('Could not save project. Check required fields.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success('Project removed.');
    },
  });

  const filtered = projects.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.technologies.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Projects &amp; Case Studies</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Create, edit, reorder, or remove software architecture case studies and repositories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="pl-8 h-9 w-44 sm:w-56 text-xs"
            />
          </div>
          <Dialog
            open={open}
            onOpenChange={(val) => {
              setOpen(val);
              if (!val) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetForm}>
                <Plus className="h-4 w-4" />
                <span>Add Project</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Project' : 'New Project'}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveMutation.mutate();
                }}
                className="space-y-4 mt-3"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium block mb-1">Project Title *</label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Category *</label>
                    <Input value={category} onChange={(e) => setCategory(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Short Summary *</label>
                  <Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Full Case Study Description *</label>
                  <Textarea value={fullDescription} onChange={(e) => setFullDescription(e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Architecture Notes</label>
                  <Textarea
                    className="min-h-[80px]"
                    value={architectureNotes}
                    onChange={(e) => setArchitectureNotes(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium block mb-1">Technologies (comma-separated)</label>
                    <Input value={technologiesText} onChange={(e) => setTechnologiesText(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Cover Image URL (optional)</label>
                    <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/uploads/..." />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">GitHub URL</label>
                    <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Live Demo URL</label>
                    <Input value={liveDemoUrl} onChange={(e) => setLiveDemoUrl(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <Switch checked={featured} onCheckedChange={setFeatured} />
                    <span>Featured Case Study</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <Switch checked={isPlaceholder} onCheckedChange={setIsPlaceholder} />
                    <span>Editable Template</span>
                  </label>
                  <div>
                    <label className="text-xs font-medium block mb-1">Sort Order</label>
                    <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : 'Save Project'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-zinc-500">No projects found.</p>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filtered.map((p) => (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-semibold">
                    {p.title}{' '}
                    {p.featured ? (
                      <span className="text-xs font-normal text-blue-600 dark:text-blue-400">· Featured</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {p.category} · {p.technologies.join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ExperienceAdminPanel({ experiences }: { experiences: ExperienceDto[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('Present');
  const [durationLabel, setDurationLabel] = useState('');
  const [summary, setSummary] = useState('');
  const [responsibilitiesText, setResponsibilitiesText] = useState('');
  const [achievementsText, setAchievementsText] = useState('');
  const [technologiesText, setTechnologiesText] = useState('C#, .NET Web API, SQL');
  const [displayOrder, setDisplayOrder] = useState('0');

  const openCreate = () => {
    setEditingId(null);
    setCompany('');
    setPosition('');
    setLocation('');
    setStartDate('');
    setEndDate('Present');
    setDurationLabel('');
    setSummary('');
    setResponsibilitiesText('');
    setAchievementsText('');
    setTechnologiesText('C#, .NET Web API, SQL');
    setDisplayOrder(String(experiences.length + 1));
    setOpen(true);
  };

  const openEdit = (exp: ExperienceDto) => {
    setEditingId(exp.id);
    setCompany(exp.company);
    setPosition(exp.position);
    setLocation(exp.location);
    setStartDate(exp.startDate);
    setEndDate(exp.endDate || 'Present');
    setDurationLabel(exp.durationLabel);
    setSummary(exp.summary);
    setResponsibilitiesText(exp.responsibilities.join('\n'));
    setAchievementsText(exp.achievements.join('\n'));
    setTechnologiesText(exp.technologies.join(', '));
    setDisplayOrder(String(exp.displayOrder));
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        company,
        position,
        location,
        startDate,
        endDate: endDate || 'Present',
        durationLabel,
        summary,
        responsibilities: responsibilitiesText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        achievements: achievementsText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        technologies: technologiesText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        displayOrder: Number(displayOrder) || 0,
      };
      return editingId ? adminApi.updateExperience(editingId, payload) : adminApi.createExperience(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['experiences'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success(editingId ? 'Experience updated.' : 'Experience added.');
      setOpen(false);
    },
    onError: () => toast.error('Could not save experience. Check required fields.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteExperience(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['experiences'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success('Experience removed.');
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Work Experience</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Create, edit, or delete engineering roles, responsibilities, and achievements.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          <span>Add Experience</span>
        </Button>
      </CardHeader>

      <CardContent>
        {experiences.length === 0 ? (
          <p className="text-sm text-zinc-500">No work experience entries yet.</p>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {experiences.map((exp) => (
              <div key={exp.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-semibold">
                    {exp.position} — {exp.company}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {exp.startDate} – {exp.endDate || 'Present'} ({exp.durationLabel}) · {exp.location}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">{exp.summary}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEdit(exp)}>
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(exp.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Work Experience' : 'Add Work Experience'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4 mt-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium block mb-1">Company *</label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Position *</label>
                <Input value={position} onChange={(e) => setPosition(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Location *</label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Duration Label *</label>
                <Input placeholder="e.g. 2 years, 1 month" value={durationLabel} onChange={(e) => setDurationLabel(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Start Date *</label>
                <Input placeholder="e.g. March 2021" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">End Date</label>
                <Input placeholder="e.g. Present" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Role Summary *</label>
              <Textarea className="min-h-[80px]" value={summary} onChange={(e) => setSummary(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Responsibilities (one per line)</label>
              <Textarea
                className="min-h-[90px]"
                value={responsibilitiesText}
                onChange={(e) => setResponsibilitiesText(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Key Achievements (one per line)</label>
              <Textarea
                className="min-h-[70px]"
                value={achievementsText}
                onChange={(e) => setAchievementsText(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium block mb-1">Technologies (comma-separated)</label>
                <Input value={technologiesText} onChange={(e) => setTechnologiesText(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Sort Order</label>
                <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save Experience'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function SkillsAdminPanel({ categories }: { categories: SkillCategoryDto[] }) {
  const qc = useQueryClient();

  // Category dialog
  const [catOpen, setCatOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catName, setCatName] = useState('');
  const [catOrder, setCatOrder] = useState('0');

  // Skill dialog
  const [skillOpen, setSkillOpen] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<number | null>(null);
  const [skillName, setSkillName] = useState('');
  const [skillDesc, setSkillDesc] = useState('');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 1);
  const [skillOrder, setSkillOrder] = useState('0');

  const openCatCreate = () => {
    setEditingCatId(null);
    setCatName('');
    setCatOrder(String(categories.length + 1));
    setCatOpen(true);
  };

  const openCatEdit = (cat: SkillCategoryDto) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatOrder(String(cat.displayOrder));
    setCatOpen(true);
  };

  const saveCategory = useMutation({
    mutationFn: () => {
      const payload = { name: catName, displayOrder: Number(catOrder) || 0 };
      return editingCatId
        ? adminApi.updateSkillCategory(editingCatId, payload)
        : adminApi.createSkillCategory(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success(editingCatId ? 'Category updated.' : 'Category created.');
      setCatOpen(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not save category.');
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (id: number) => adminApi.deleteSkillCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success('Category deleted.');
    },
  });

  const openSkillCreate = (defaultCatId?: number) => {
    setEditingSkillId(null);
    setCategoryId(defaultCatId || categories[0]?.id || 1);
    setSkillName('');
    setSkillDesc('');
    setSkillOrder('0');
    setSkillOpen(true);
  };

  const openSkillEdit = (s: SkillItemDto) => {
    setEditingSkillId(s.id);
    setCategoryId(s.categoryId);
    setSkillName(s.name);
    setSkillDesc(s.description || '');
    setSkillOrder(String(s.displayOrder));
    setSkillOpen(true);
  };

  const saveSkill = useMutation({
    mutationFn: () => {
      const payload = {
        categoryId,
        name: skillName,
        description: skillDesc || null,
        displayOrder: Number(skillOrder) || 0,
      };
      return editingSkillId ? adminApi.updateSkill(editingSkillId, payload) : adminApi.createSkill(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success(editingSkillId ? 'Skill updated.' : 'Skill added.');
      setSkillOpen(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not save skill.');
    },
  });

  const delSkill = useMutation({
    mutationFn: (id: number) => adminApi.deleteSkill(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success('Skill removed.');
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Technical Skills &amp; Categories</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Manage both skill categories and individual skills with descriptions.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={openCatCreate}>
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </Button>
          <Button size="sm" onClick={() => openSkillCreate()} disabled={categories.length === 0}>
            <Plus className="h-4 w-4" />
            <span>Add Skill</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {categories.length === 0 ? (
          <p className="text-sm text-zinc-500">Create a skill category first to organize skills.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {categories.map((cat) => (
              <div key={cat.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <h3 className="text-sm font-semibold">{cat.name}</h3>
                    <p className="font-mono text-[11px] text-zinc-500 tabular-nums">
                      {cat.skills.length} skills
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => openSkillCreate(cat.id)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openCatEdit(cat)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteCategory.mutate(cat.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {cat.skills.length === 0 ? (
                  <p className="text-xs text-zinc-500">No skills in this category yet.</p>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {cat.skills.map((s) => (
                      <div key={s.id} className="flex items-start justify-between gap-3 py-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{s.name}</p>
                          {s.description ? (
                            <p className="text-zinc-500 dark:text-zinc-400 truncate">{s.description}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openSkillEdit(s)}
                            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => delSkill.mutate(s.id)}
                            className="text-red-500 hover:text-red-400 cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Skill Category Dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCatId ? 'Edit Skill Category' : 'Add Skill Category'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveCategory.mutate();
            }}
            className="space-y-4 mt-3"
          >
            <div>
              <label className="text-xs font-medium block mb-1">Category Name *</label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Sort Order</label>
              <Input type="number" value={catOrder} onChange={(e) => setCatOrder(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCatOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveCategory.isPending}>
                {saveCategory.isPending ? 'Saving...' : 'Save Category'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Skill Dialog */}
      <Dialog open={skillOpen} onOpenChange={setSkillOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSkillId ? 'Edit Skill' : 'Add Skill'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSkill.mutate();
            }}
            className="space-y-4 mt-3"
          >
            <div>
              <label className="text-xs font-medium block mb-1">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0B0D] px-3 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Skill Name *</label>
              <Input value={skillName} onChange={(e) => setSkillName(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Context / Description</label>
              <Input value={skillDesc} onChange={(e) => setSkillDesc(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Sort Order</label>
              <Input type="number" value={skillOrder} onChange={(e) => setSkillOrder(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSkillOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveSkill.isPending}>
                {saveSkill.isPending ? 'Saving...' : 'Save Skill'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function ProductsAndOrdersAdminPanel({
  products,
  orders,
}: {
  products: ProductDto[];
  orders: OrderDto[];
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | StoreOrderStatus>('all');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Backend Kits');
  const [sku, setSku] = useState('PB-KIT-01');
  const [priceUsd, setPriceUsd] = useState('49');
  const [priceNpr, setPriceNpr] = useState('6500');
  const [inventoryCount, setInventoryCount] = useState('100');
  const [isDigital, setIsDigital] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState(
    'Instant digital download link sent via email upon confirmation.'
  );
  const [featuresText, setFeaturesText] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('Backend Kits');
    setSku('PB-KIT-01');
    setPriceUsd('49');
    setPriceNpr('6500');
    setInventoryCount('100');
    setIsDigital(true);
    setIsActive(true);
    setImageUrl('');
    setPdfUrl('');
    setShortDescription('');
    setFullDescription('');
    setDeliveryInfo('Instant digital download link sent via email upon confirmation.');
    setFeaturesText('');
  };

  const openEdit = (p: ProductDto) => {
    setEditingId(p.id);
    setTitle(p.title);
    setCategory(p.category);
    setSku(p.sku);
    setPriceUsd(String(p.priceUsd));
    setPriceNpr(String(p.priceNpr));
    setInventoryCount(String(p.inventoryCount));
    setIsDigital(p.isDigital);
    setIsActive(p.isActive);
    setImageUrl(p.imageUrl || '');
    setPdfUrl(p.pdfUrl || '');
    setShortDescription(p.shortDescription);
    setFullDescription(p.fullDescription);
    setDeliveryInfo(p.deliveryInfo);
    setFeaturesText(p.features.join('\n'));
    setOpen(true);
  };

  const handlePdfUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadingPdf(true);
    try {
      const uploaded = await adminApi.uploadProductPdf(file);
      setPdfUrl(uploaded.pdfUrl);
      setIsDigital(true);
      toast.success(`PDF stored in private storage (${uploaded.originalName}).`);
    } catch {
      toast.error('Failed to upload PDF file (max 20MB, valid %PDF- file).');
    } finally {
      setUploadingPdf(false);
    }
  };

  const saveProduct = useMutation({
    mutationFn: () => {
      const payload = {
        title,
        category,
        sku,
        priceUsd: Number(priceUsd) || 0,
        priceNpr: Number(priceNpr) || 0,
        inventoryCount: Number(inventoryCount) || 0,
        isDigital,
        isActive,
        imageUrl: imageUrl || null,
        pdfUrl: pdfUrl.trim() || null,
        shortDescription,
        fullDescription: fullDescription || shortDescription,
        deliveryInfo,
        features: featuresText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        featured: true,
        displayOrder: 0,
      };
      return editingId ? adminApi.updateProduct(editingId, payload) : adminApi.createProduct(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success(editingId ? 'Product updated.' : 'Product created.');
      setOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to save product.'),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: number) => adminApi.deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success('Product removed.');
    },
  });

  const updateOrder = useMutation({
    mutationFn: ({ id, status }: { id: number; status: StoreOrderStatus }) =>
      adminApi.updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success('Order status updated.');
    },
  });

  const deleteOrder = useMutation({
    mutationFn: (id: number) => adminApi.deleteOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success('Order removed.');
    },
  });

  const filteredProducts = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const filteredOrders = orders.filter((o) => (orderStatusFilter === 'all' ? true : o.status === orderStatusFilter));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Products Catalog</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Add, edit, upload PDF books, toggle visibility, or remove products sold on /products.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="pl-8 h-9 w-40 sm:w-52 text-xs"
              />
            </div>
            <Dialog
              open={open}
              onOpenChange={(val) => {
                setOpen(val);
                if (!val) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" onClick={resetForm}>
                  <Plus className="h-4 w-4" />
                  <span>Add Product</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit Product' : 'Add Product'}</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault();
                    saveProduct.mutate();
                  }}
                  className="space-y-4 mt-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium block mb-1">Product Title *</label>
                      <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">Category *</label>
                      <Input required value={category} onChange={(e) => setCategory(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">SKU *</label>
                      <Input required value={sku} onChange={(e) => setSku(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">Stock Count</label>
                      <Input
                        type="number"
                        min={0}
                        value={inventoryCount}
                        onChange={(e) => setInventoryCount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">Price (USD) *</label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        required
                        value={priceUsd}
                        onChange={(e) => setPriceUsd(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">Price (NPR) *</label>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        required
                        value={priceNpr}
                        onChange={(e) => setPriceNpr(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1">Image URL (optional)</label>
                    <Input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="/uploads/product-cover.jpg"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium block">PDF Book File Path or Upload (optional)</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={pdfUrl}
                        onChange={(e) => setPdfUrl(e.target.value)}
                        placeholder="/books/my-ebook.pdf or upload below"
                        className="flex-1"
                      />
                      <label className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer whitespace-nowrap shrink-0">
                        <span>{uploadingPdf ? 'Uploading PDF...' : 'Upload PDF'}</span>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="sr-only"
                          disabled={uploadingPdf}
                          onChange={(e) => handlePdfUpload(e.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1">Short Description *</label>
                    <Input
                      required
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1">Full Description *</label>
                    <Textarea
                      required
                      className="min-h-[90px]"
                      value={fullDescription}
                      onChange={(e) => setFullDescription(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1">Delivery Info</label>
                    <Input value={deliveryInfo} onChange={(e) => setDeliveryInfo(e.target.value)} />
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1">Included Features (one per line)</label>
                    <Textarea
                      className="min-h-[80px]"
                      value={featuresText}
                      onChange={(e) => setFeaturesText(e.target.value)}
                      placeholder="Clean source code&#10;Documentation & SQL scripts"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 text-xs">
                      <Switch checked={isDigital} onCheckedChange={setIsDigital} />
                      <span>Digital Product (No shipping required)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <Switch checked={isActive} onCheckedChange={setIsActive} />
                      <span>Published on Storefront</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saveProduct.isPending || uploadingPdf}>
                      {saveProduct.isPending ? 'Saving...' : 'Save Product'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {filteredProducts.length === 0 ? (
            <p className="text-sm text-zinc-500">No products match your search.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredProducts.map((p) => (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
                  <div>
                    <p className="text-sm font-semibold">
                      {p.title}{' '}
                      {p.hasPdf || p.pdfUrl ? (
                        <span className="text-xs font-normal text-blue-600 dark:text-blue-400">· PDF Book</span>
                      ) : null}{' '}
                      {!p.isActive ? <span className="text-xs font-normal text-amber-500">· Hidden</span> : null}
                    </p>
                    <p className="text-xs text-zinc-500 font-mono tabular-nums mt-0.5">
                      {p.sku} · {p.category} · ${p.priceUsd.toFixed(2)} / NPR {p.priceNpr.toLocaleString()} ·{' '}
                      {p.isDigital ? 'Digital' : `${p.inventoryCount} in stock`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteProduct.mutate(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Customer Orders</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Track incoming purchases, update fulfillment status, or remove cancelled records.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 p-1 text-xs">
            {(['all', 'pending', 'paid', 'fulfilled', 'cancelled'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setOrderStatusFilter(st)}
                className={`rounded-md px-2.5 py-1 font-medium capitalize whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  orderStatusFilter === st
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
          {filteredOrders.length === 0 ? (
            <p className="text-sm text-zinc-500">No orders match this filter.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredOrders.map((order) => (
                <div key={order.id} className="py-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        <span className="font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                          {order.orderNumber}
                        </span>{' '}
                        · {order.customerName} ({order.customerEmail})
                      </p>
                      <p className="text-xs text-zinc-500 font-mono tabular-nums">
                        {order.currency} {order.totalAmount.toLocaleString()} · {order.paymentMethod.toUpperCase()}
                        {order.providerRefId ? ` (Ref: ${order.providerRefId})` : ''} · {order.customerPhone}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {(['pending', 'paid', 'fulfilled', 'cancelled'] as StoreOrderStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => updateOrder.mutate({ id: order.id, status: st })}
                          className={`px-2.5 py-1 rounded-md border font-mono capitalize cursor-pointer transition-colors ${
                            order.status === st
                              ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                              : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                      <Button variant="destructive" size="sm" onClick={() => deleteOrder.mutate(order.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Items: {order.items.map((i) => `${i.title} ×${i.quantity}`).join(', ')}
                    {order.shippingAddress ? ` · Ship to: ${order.shippingAddress}` : ''}
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
