import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, MessageSquare, Search } from 'lucide-react';
import { useAuth } from '@/src/app/providers/AuthProvider';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import { NewsletterForm } from '@/src/components/common/NewsletterForm';
import { trackAnalyticsSafe } from '@/src/utils/analytics';
import { Input, Textarea } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Skeleton } from '@/src/components/ui/SwitchAndSkeleton';

function estimateReadMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function ArticleContentBlocks({ content }: { content: string }) {
  const blocks: { type: 'heading' | 'list' | 'code' | 'paragraph'; text: string; items?: string[] }[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: 'code', text: codeLines.join('\n') });
      i += 1;
      continue;
    }

    if (line.trim().startsWith('## ')) {
      blocks.push({ type: 'heading', text: line.trim().replace(/^##\s+/, '') });
      i += 1;
      continue;
    }

    if (line.trim().startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().replace(/^-\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'list', text: '', items });
      continue;
    }

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('## ') &&
      !lines[i].trim().startsWith('- ') &&
      !lines[i].trim().startsWith('```')
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
  }

  return (
    <div className="space-y-6 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return (
            <h2
              key={idx}
              className="pt-4 font-display text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              {block.text}
            </h2>
          );
        }
        if (block.type === 'list' && block.items) {
          return (
            <ul key={idx} className="space-y-2 list-disc pl-6 text-zinc-700 dark:text-zinc-300">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'code') {
          return (
            <pre
              key={idx}
              className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#0B0B0D] p-4 font-mono text-xs sm:text-sm leading-relaxed text-zinc-900 dark:text-zinc-100"
            >
              <code>{block.text}</code>
            </pre>
          );
        }
        return <p key={idx}>{block.text}</p>;
      })}
    </div>
  );
}

export function BlogListPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data, isLoading } = useQuery({
    queryKey: ['blog', search],
    queryFn: () => portfolioApi.getBlogPosts({ search: search.trim() || undefined }),
  });

  const allPosts = data?.items || [];

  const categories = useMemo(() => {
    const unique = Array.from(new Set(allPosts.map((p) => p.categoryName).filter(Boolean)));
    return ['All', ...unique];
  }, [allPosts]);

  const posts = useMemo(() => {
    if (selectedCategory === 'All') return allPosts;
    return allPosts.filter((p) => p.categoryName === selectedCategory);
  }, [allPosts, selectedCategory]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (data && data.enabled === false) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl font-bold text-zinc-900 dark:text-zinc-50">Articles Coming Soon</h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
          The writing module is currently disabled. It can be activated anytime from the Admin Dashboard Settings.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Portfolio</span>
      </Link>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Blogs &amp; Engineering Articles
          </h1>
          <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
            Technical notes on .NET Web API architecture, SQL optimization, and full-stack delivery.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="pl-9"
          />
        </div>
      </div>

      {categories.length > 1 ? (
        <div className="mt-8 flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 w-fit">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-50 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      ) : null}

      {posts.length === 0 ? (
        <div className="mt-10 rounded-xl border border-zinc-200 dark:border-zinc-800 p-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
          No published articles match your filter yet.
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {posts.map((post) => {
            const readMins = estimateReadMinutes(post.content);
            return (
              <article
                key={post.id}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-6 flex flex-col justify-between"
              >
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
                    <h2 className="mt-2.5 text-xl font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {post.title}
                    </h2>
                  </Link>
                  <p className="mt-2.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{post.excerpt}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
                  <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {post.tags.join(' · ')}
                  </p>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                  >
                    <span>Read Article</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-6">
        <NewsletterForm />
      </div>
    </section>
  );
}

export function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();

  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [commentText, setCommentText] = useState('');

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: () => portfolioApi.getBlogBySlug(slug || ''),
    enabled: Boolean(slug),
  });

  const commentsQuery = useQuery({
    queryKey: ['blog-comments', slug],
    queryFn: () => portfolioApi.getBlogComments(slug || ''),
    enabled: Boolean(slug && post),
  });

  useEffect(() => {
    if (user) {
      setAuthorName((prev) => prev || user.fullName);
      setAuthorEmail((prev) => prev || user.email);
    }
  }, [user]);

  useEffect(() => {
    if (post) {
      document.title = `${post.title} — Pramesh Bhattarai`;
      trackAnalyticsSafe({ eventType: 'article_view', path: `/blog/${post.slug}`, entityId: post.id });
    }
  }, [post]);

  const commentMutation = useMutation({
    mutationFn: () =>
      portfolioApi.postBlogComment(slug || '', {
        authorName,
        authorEmail,
        comment: commentText,
      }),
    onSuccess: () => {
      setCommentText('');
      qc.invalidateQueries({ queryKey: ['blog-comments', slug] });
      toast.success('Comment posted.');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not post comment.';
      toast.error(msg);
    },
  });

  const handleCommentSubmit = (e: FormEvent) => {
    e.preventDefault();
    commentMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Article Not Available</h1>
        <Button className="mt-6" asChild>
          <Link to="/blog">Back to Articles</Link>
        </Button>
      </div>
    );
  }

  const readMins = estimateReadMinutes(post.content);
  const comments = commentsQuery.data || [];

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link
        to="/blog"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>All Articles</span>
      </Link>

      <header className="mt-8 space-y-3">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
          {post.categoryName} · {post.publishedAt?.slice(0, 10) || 'Draft'} · {readMins} min read
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {post.title}
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">{post.excerpt}</p>
        {post.tags.length > 0 ? (
          <p className="pt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {post.tags.join(' · ')}
          </p>
        ) : null}
      </header>

      <div className="mt-10 border-t border-zinc-200 dark:border-zinc-800 pt-8">
        <ArticleContentBlocks content={post.content} />
      </div>

      {/* Article Comments */}
      <section className="mt-14 border-t border-zinc-200 dark:border-zinc-800 pt-10 space-y-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t('commentsTitle')} ({comments.length})
          </h2>
        </div>

        <form
          onSubmit={handleCommentSubmit}
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t('leaveCommentTitle')}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="comment-author-name" className="text-xs font-medium block mb-1">
                Name *
              </label>
              <Input
                id="comment-author-name"
                required
                minLength={2}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="comment-author-email" className="text-xs font-medium block mb-1">
                Email *
              </label>
              <Input
                id="comment-author-email"
                type="email"
                required
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                placeholder="you@domain.com"
              />
            </div>
          </div>
          <div>
            <label htmlFor="comment-body" className="text-xs font-medium block mb-1">
              Comment *
            </label>
            <Textarea
              id="comment-body"
              required
              minLength={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share feedback or ask a technical question..."
              className="min-h-[84px]"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={commentMutation.isPending}>
              {commentMutation.isPending ? 'Posting...' : t('postCommentBtn')}
            </Button>
          </div>
        </form>

        {comments.length === 0 ? (
          <p className="text-sm text-zinc-500">No comments yet. Start the discussion above.</p>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114]">
            {comments.map((c) => (
              <div key={c.id} className="p-5 space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{c.authorName}</span>
                  <span className="font-mono text-[11px] text-zinc-500 tabular-nums">{c.createdAt}</span>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{c.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
