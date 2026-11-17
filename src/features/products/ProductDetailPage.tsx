import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, Check, Heart, Minus, Package, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useAuth } from '@/src/app/providers/AuthProvider';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import { SafeImage } from '@/src/components/common/SafeImage';
import { StarRatingDisplay, StarRatingInput } from '@/src/components/common/StarRating';
import { Button } from '@/src/components/ui/Button';
import { Textarea } from '@/src/components/ui/Input';
import { Skeleton } from '@/src/components/ui/SwitchAndSkeleton';
import { trackAnalyticsSafe } from '@/src/utils/analytics';
import { formatMoney, getProductPrice, useCart } from './CartContext';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();

  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const { currency, setCurrency, addItem, openCart, openAuthPrompt, totalCount } = useCart();

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => portfolioApi.getProductBySlug(slug || ''),
    enabled: Boolean(slug),
  });

  const reviewsQuery = useQuery({
    queryKey: ['product-reviews', slug],
    queryFn: () => portfolioApi.getProductReviews(slug || ''),
    enabled: Boolean(slug),
  });

  const wishlistQuery = useQuery({
    queryKey: ['my-wishlist'],
    queryFn: portfolioApi.getMyWishlist,
    enabled: Boolean(user),
  });

  const myExistingReview = useMemo(() => {
    if (!user || !reviewsQuery.data) return undefined;
    return reviewsQuery.data.items.find((r) => r.userId === user.id);
  }, [user, reviewsQuery.data]);

  useEffect(() => {
    if (myExistingReview) {
      setRating(myExistingReview.rating);
      setComment(myExistingReview.comment);
    }
  }, [myExistingReview]);

  useEffect(() => {
    if (product) {
      document.title = `${product.title} — Pramesh Bhattarai`;
      trackAnalyticsSafe({ eventType: 'product_view', path: `/products/${product.slug}`, entityId: product.id });
    }
  }, [product]);

  const isWishlisted = useMemo(() => {
    if (!product || !wishlistQuery.data) return false;
    return wishlistQuery.data.some((p) => p.id === product.id);
  }, [product, wishlistQuery.data]);

  const toggleWishlistMutation = useMutation({
    mutationFn: (productId: number) => portfolioApi.toggleWishlist(productId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['my-wishlist'] });
      toast.success(res.wishlisted ? 'Saved to your wishlist.' : 'Removed from wishlist.');
    },
    onError: () => toast.error('Could not update wishlist.'),
  });

  const submitReviewMutation = useMutation({
    mutationFn: () => portfolioApi.submitProductReview(slug || '', { rating, comment }),
    onSuccess: (data) => {
      qc.setQueryData(['product-reviews', slug], data);
      qc.invalidateQueries({ queryKey: ['product', slug] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Review & rating saved.');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not submit review.';
      toast.error(msg);
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: number) => portfolioApi.deleteProductReview(slug || '', reviewId),
    onSuccess: (data) => {
      qc.setQueryData(['product-reviews', slug], data);
      qc.invalidateQueries({ queryKey: ['product', slug] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setComment('');
      setRating(5);
      toast.success('Review deleted.');
    },
    onError: () => toast.error('Could not remove review.'),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 space-y-6">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Product Not Found</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This product is unavailable or has been removed from the catalog.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/products">{t('backToProducts')}</Link>
        </Button>
      </div>
    );
  }

  const unitPrice = getProductPrice(product, currency);
  const inStock = product.isDigital || product.inventoryCount > 0;
  const averageRating = reviewsQuery.data?.averageRating ?? product.averageRating ?? 0;
  const reviewCount = reviewsQuery.data?.reviewCount ?? product.reviewCount ?? 0;
  const reviews = reviewsQuery.data?.items || [];

  const handleReviewSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthPrompt();
      return;
    }
    submitReviewMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t('backToProducts')}</span>
        </Link>

        <Button variant="outline" size="sm" onClick={openCart} className="gap-2">
          <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>{t('cart')}</span>
          <span className="font-mono text-xs tabular-nums">({totalCount})</span>
        </Button>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
        {/* Left Column: Visual, Technical Details & Customer Reviews */}
        <div className="lg:col-span-7 space-y-8">
          {product.imageUrl ? (
            <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <SafeImage
                src={product.imageUrl}
                alt={product.title}
                fallbackTitle={product.title}
                fallbackSubtitle={product.category}
                className="h-full w-full"
              />
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-[#0B0B0E] p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.3] dark:opacity-[0.2]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 1px 1px, rgb(161 161 170 / 0.35) 1px, transparent 0)',
                  backgroundSize: '20px 20px',
                }}
              />
              <div className="relative space-y-5">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    {product.hasPdf ? (
                      <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                    <span>SKU: {product.sku}</span>
                  </span>
                  <span>
                    {product.hasPdf
                      ? t('pdfBooksBadge')
                      : product.isDigital
                        ? t('digitalDelivery')
                        : 'Physical Product'}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {product.deliveryInfo}
                </p>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t('overview')}</h2>
            <p className="mt-3 text-base leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
              {product.fullDescription}
            </p>
          </div>

          {product.features.length > 0 ? (
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t('whatIsIncluded')}</h2>
              <ul className="mt-4 space-y-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                {product.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Customer Ratings & Reviews Section */}
          <section className="border-t border-zinc-200 dark:border-zinc-800 pt-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t('reviewsTitle')}</h2>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-500">
                  <StarRatingDisplay rating={averageRating} count={reviewCount} size="md" />
                  <span>{t('reviewsCountLabel')}</span>
                </div>
              </div>
            </div>

            {user ? (
              <form
                onSubmit={handleReviewSubmit}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {myExistingReview ? t('updateReview') : t('writeReview')}
                  </h3>
                  <StarRatingInput value={rating} onChange={setRating} />
                </div>

                <div>
                  <label htmlFor="review-comment" className="sr-only">
                    {t('yourReview')}
                  </label>
                  <Textarea
                    id="review-comment"
                    required
                    minLength={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('reviewPlaceholder')}
                    className="min-h-[84px]"
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={submitReviewMutation.isPending}>
                    {submitReviewMutation.isPending ? t('submittingReview') : t('submitReview')}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#111114] p-5 flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{t('signInToReview')}</p>
                <Button variant="outline" size="sm" onClick={openAuthPrompt}>
                  {t('navSignIn')}
                </Button>
              </div>
            )}

            {reviews.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('noReviewsYet')}</p>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114]">
                {reviews.map((rev) => {
                  const canDelete = user && (user.id === rev.userId || user.role === 'Admin');
                  return (
                    <div key={rev.id} className="p-5 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{rev.authorName}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                            <StarRatingDisplay rating={rev.rating} />
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-[11px] tabular-nums">{rev.updatedAt}</span>
                          </div>
                        </div>
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => deleteReviewMutation.mutate(rev.id)}
                            aria-label={`${t('deleteReview')} review`}
                            className="text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{rev.comment}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Contiguous Purchase Module */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-6 sm:p-7 space-y-6">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {product.category} · {inStock ? t('inStock') : t('soldOut')}
              </span>
              <div className="flex items-center rounded-md border border-zinc-200 dark:border-zinc-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-2 py-0.5 font-mono text-[11px] rounded-xs cursor-pointer ${
                    currency === 'USD'
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-500'
                  }`}
                >
                  USD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('NPR')}
                  className={`px-2 py-0.5 font-mono text-[11px] rounded-xs cursor-pointer ${
                    currency === 'NPR'
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-500'
                  }`}
                >
                  NPR
                </button>
              </div>
            </div>

            <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 text-balance">
              {product.title}
            </h1>

            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              <StarRatingDisplay rating={averageRating} count={reviewCount} />
              {product.hasPdf ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{t('pdfDownloadIncluded')}</span>
                </span>
              ) : null}
            </div>

            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {product.shortDescription}
            </p>
          </div>

          <div className="border-t border-b border-zinc-100 dark:border-zinc-800/80 py-4 flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                {formatMoney(unitPrice, currency)}
              </span>
              {currency === 'USD' && product.compareAtUsd ? (
                <span className="font-mono text-sm line-through text-zinc-400 tabular-nums">
                  ${product.compareAtUsd.toFixed(2)}
                </span>
              ) : null}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => (user ? toggleWishlistMutation.mutate(product.id) : openAuthPrompt())}
              className="gap-1.5 text-xs"
            >
              <Heart className={`h-3.5 w-3.5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{isWishlisted ? t('wishlistFilter') : t('addToWishlist')}</span>
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t('quantity')}</span>
              <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="h-9 w-9 inline-flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-10 text-center font-mono text-sm tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(25, q + 1))}
                  aria-label="Increase quantity"
                  className="h-9 w-9 inline-flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                disabled={!inStock}
                onClick={() => addItem(product, quantity, false)}
                className="w-full"
              >
                {t('addToCart')}
              </Button>
              <Button
                disabled={!inStock}
                onClick={() => addItem(product, quantity, true)}
                className="w-full"
              >
                {t('buyNow')}
              </Button>
            </div>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Supports eSewa, Khalti, Card / Stripe, and Direct Bank Transfer checkout.
          </p>
        </aside>
      </div>
    </div>
  );
}
