import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ExternalLink, Github, Search } from 'lucide-react';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import { SectionHeading } from '@/src/components/common/SectionHeading';
import { SafeImage } from '@/src/components/common/SafeImage';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Skeleton } from '@/src/components/ui/SwitchAndSkeleton';
import type { ProjectDto } from '@/src/types/portfolio';

function formatIndex(idx: number): string {
  return String(idx + 1).padStart(2, '0');
}

function FeaturedCaseStudyRow({ project, index }: { project: ProjectDto; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.28 }}
      className="group overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0B0E] transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-8 lg:p-10">
          <div>
            <div className="flex items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                {formatIndex(index)}
              </span>
              <span aria-hidden="true">/</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{project.category}</span>
              <span aria-hidden="true">/</span>
              <span>Featured Case Study</span>
            </div>

            <Link to={`/projects/${project.slug}`} className="block mt-4">
              <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-balance">
                {project.title.replace(/\s*\(Placeholder.*?\)/gi, '')}
              </h3>
            </Link>

            <p className="mt-3.5 text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-2xl">
              {project.shortDescription}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100 dark:border-zinc-800/80 pt-5">
            <Link
              to={`/projects/${project.slug}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
            >
              <span>Read Case Study</span>
              <ArrowUpRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>

            <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {project.githubUrl ? (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${project.title} GitHub`}
                  className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0"
                >
                  <Github className="h-4 w-4" />
                  <span>Source Code</span>
                </a>
              ) : null}
              {project.liveDemoUrl ? (
                <a
                  href={project.liveDemoUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${project.title} Live Demo`}
                  className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Live Preview</span>
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-[#111115]">
          {project.imageUrl ? (
            <Link to={`/projects/${project.slug}`} className="block h-full min-h-[260px] overflow-hidden">
              <SafeImage
                src={project.imageUrl}
                alt={project.title}
                fallbackTitle={project.title}
                fallbackSubtitle={project.category}
                className="h-full w-full"
                imgClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </Link>
          ) : (
            <div className="flex h-full flex-col justify-between p-6 sm:p-8 lg:p-10 space-y-6">
              {project.architectureNotes ? (
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Architecture Focus</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {project.architectureNotes}
                  </p>
                </div>
              ) : null}

              <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 pt-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Technology Stack</span>
                  <span className="font-mono tabular-nums">{project.technologies.length} components</span>
                </div>
                <p className="font-mono text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {project.technologies.join(' · ')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function CaseStudyCard({ project, index }: { project: ProjectDto; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.05, 0.2) }}
      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0B0E] transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
    >
      {project.imageUrl ? (
        <Link
          to={`/projects/${project.slug}`}
          className="block aspect-[16/9] overflow-hidden border-b border-zinc-200 dark:border-zinc-800/80"
        >
          <SafeImage
            src={project.imageUrl}
            alt={project.title}
            fallbackTitle={project.title}
            fallbackSubtitle={project.category}
            className="h-full w-full"
            imgClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>
      ) : null}

      <div className="flex flex-1 flex-col justify-between p-6 sm:p-7">
        <div>
          <div className="flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                {formatIndex(index)}
              </span>
              <span aria-hidden="true">/</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{project.category}</span>
            </div>
            <span className="font-mono tabular-nums">{project.technologies.length} tech</span>
          </div>

          <Link to={`/projects/${project.slug}`} className="block mt-3.5">
            <h3 className="font-display text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {project.title.replace(/\s*\(Placeholder.*?\)/gi, '')}
            </h3>
          </Link>

          <p className="mt-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {project.shortDescription}
          </p>

          {project.architectureNotes ? (
            <div className="mt-5 border-t border-zinc-100 dark:border-zinc-800/80 pt-3.5">
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Architecture Summary</p>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-2">
                {project.architectureNotes}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-6 space-y-4">
          <p className="font-mono text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {project.technologies.join(' · ')}
          </p>

          <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 pt-4 text-xs font-medium">
            <Link
              to={`/projects/${project.slug}`}
              className="inline-flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Explore Case Study</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>

            <div className="flex items-center gap-3">
              {project.githubUrl ? (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${project.title} GitHub`}
                  className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <Github className="h-4 w-4" />
                </a>
              ) : null}
              {project.liveDemoUrl ? (
                <a
                  href={project.liveDemoUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${project.title} Live Demo`}
                  className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function ProjectsSection() {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTech, setSelectedTech] = useState('All');
  const [search, setSearch] = useState('');

  const { data: allData } = useQuery({
    queryKey: ['projects', 'all-facets'],
    queryFn: () => portfolioApi.getProjects({ pageSize: 50 }),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['projects', selectedCategory, selectedTech, search],
    queryFn: () =>
      portfolioApi.getProjects({
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        tech: selectedTech !== 'All' ? selectedTech : undefined,
        search: search.trim() || undefined,
      }),
  });

  const categories = useMemo(() => {
    const items = allData?.items || [];
    return ['All', ...Array.from(new Set(items.map((p) => p.category)))];
  }, [allData]);

  const technologies = useMemo(() => {
    const items = allData?.items || [];
    const allTechs = items.flatMap((p) => p.technologies);
    return ['All', ...Array.from(new Set(allTechs))];
  }, [allData]);

  const projects = data?.items || [];
  const leadProject = projects[0];
  const remainingProjects = projects.slice(1);

  return (
    <section id="projects" className="scroll-mt-20 border-b border-zinc-200 dark:border-zinc-800/80 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          indexLabel="06."
          title={t('projectsTitle')}
          description="Production backend architectures, custom enterprise web portals, and full-stack case studies."
        />

        {/* Single-Row Clean Filter & Search Toolbar */}
        <div className="mt-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-5">
          <div
            role="tablist"
            aria-label="Filter projects by category"
            className="flex items-center gap-1 overflow-x-auto rounded-lg bg-zinc-100 dark:bg-[#111114] p-1 border border-zinc-200 dark:border-zinc-800 w-fit max-w-full"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                role="tab"
                aria-selected={selectedCategory === cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 lg:shrink-0">
            <select
              aria-label="Filter by technology"
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              className="h-10 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0B0E] px-3 text-xs font-medium text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              {technologies.map((tech) => (
                <option key={tech} value={tech}>
                  {tech === 'All' ? 'All Technologies' : tech}
                </option>
              ))}
            </select>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search case studies..."
                aria-label="Search projects"
                className="pl-9 h-10 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Loading, Error, Empty, or Populated Case Study Showcase */}
        {isLoading ? (
          <div className="mt-10 space-y-6">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {[1, 2].map((n) => (
                <div key={n} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : isError ? (
          <div className="mt-10 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Unable to load projects right now.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-10 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No projects match the current filters.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSelectedCategory('All');
                setSelectedTech('All');
                setSearch('');
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            {leadProject ? <FeaturedCaseStudyRow project={leadProject} index={0} /> : null}

            {remainingProjects.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {remainingProjects.map((project, idx) => (
                  <CaseStudyCard key={project.id} project={project} index={idx + 1} />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
