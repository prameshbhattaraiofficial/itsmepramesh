import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import { SectionHeading } from '@/src/components/common/SectionHeading';
import { Card, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';

function estimateReadMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

export function BlogSection() {
  const { data } = useQuery({
    queryKey: ['blog', 'home-preview'],
    queryFn: () => portfolioApi.getBlogPosts(),
  });

  if (!data || data.enabled === false || data.items.length === 0) {
    return null;
  }

  const featuredPosts = data.items.slice(0, 3);

  return (
    <section id="articles" className="border-b border-zinc-200 dark:border-zinc-800/80 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            indexLabel="08."
            title="Blogs &amp; Articles"
            description="Practical technical notes on .NET Web API architecture, SQL optimization, and full-stack engineering."
          />
          <Button variant="outline" size="sm" asChild className="self-start sm:self-auto">
            <Link to="/blog">
              <span>View All Articles</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredPosts.map((post) => {
            const readMins = estimateReadMinutes(post.content);
            return (
              <Card key={post.id} className="flex flex-col justify-between">
                <CardContent className="p-6 flex flex-col justify-between h-full space-y-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{post.categoryName}</span>
                      {post.publishedAt ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{post.publishedAt.slice(0, 10)}</span>
                        </>
                      ) : null}
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{readMins} min read</span>
                    </div>

                    <Link to={`/blog/${post.slug}`} className="block group">
                      <h3 className="mt-2.5 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {post.title}
                      </h3>
                    </Link>

                    <p className="mt-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {post.excerpt}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
                    <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {post.tags.slice(0, 3).join(' · ')}
                    </p>
                    <Link
                      to={`/blog/${post.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                    >
                      <span>Read</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
