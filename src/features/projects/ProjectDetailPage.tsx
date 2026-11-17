import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Github } from 'lucide-react';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import { SafeImage } from '@/src/components/common/SafeImage';
import { Button } from '@/src/components/ui/Button';
import { Skeleton } from '@/src/components/ui/SwitchAndSkeleton';

export function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', slug],
    queryFn: () => portfolioApi.getProjectBySlug(slug || ''),
    enabled: Boolean(slug),
  });

  useEffect(() => {
    if (project) {
      document.title = `${project.title} — Pramesh Bhattarai`;
    }
  }, [project]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 space-y-6">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Project Not Found</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The requested case study could not be located.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/#projects">Back to Projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-4xl px-6 py-16">
      <Link
        to="/#projects"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Portfolio</span>
      </Link>

      <header className="mt-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{project.category}</span>
          {project.isPlaceholder ? (
            <>
              <span aria-hidden="true">·</span>
              <span>Editable Template (Update in Admin)</span>
            </>
          ) : null}
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 text-balance">
          {project.title}
        </h1>

        <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">{project.shortDescription}</p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {project.githubUrl ? (
            <Button variant="outline" size="sm" asChild>
              <a href={project.githubUrl} target="_blank" rel="noreferrer">
                <Github className="h-4 w-4" />
                <span>Source Repository</span>
              </a>
            </Button>
          ) : null}
          {project.liveDemoUrl ? (
            <Button size="sm" asChild>
              <a href={project.liveDemoUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                <span>Live Deployment</span>
              </a>
            </Button>
          ) : null}
        </div>
      </header>

      {project.imageUrl ? (
        <div className="mt-10 aspect-[16/9] overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <SafeImage
            src={project.imageUrl}
            alt={project.title}
            fallbackTitle={project.title}
            fallbackSubtitle={project.category}
            className="h-full w-full"
          />
        </div>
      ) : null}

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Project Overview</h2>
            <p className="mt-3 text-base leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
              {project.fullDescription}
            </p>
          </div>

          {project.architectureNotes ? (
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Architecture Notes</h2>
              <p className="mt-3 text-base leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
                {project.architectureNotes}
              </p>
            </div>
          ) : null}
        </div>

        <aside className="lg:col-span-4 space-y-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-6 h-fit">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Technology Stack</h3>
            <p className="mt-2 font-mono text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {project.technologies.join(' · ')}
            </p>
          </div>
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Category</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{project.category}</p>
          </div>
        </aside>
      </div>
    </article>
  );
}
