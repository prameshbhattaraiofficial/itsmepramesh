import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { ArrowUpRight, BookOpen, Heart, LogIn, Package, Search, ShoppingBag, User } from 'lucide-react';
import { useAuth } from '@/src/app/providers/AuthProvider';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import { SafeImage } from '@/src/components/common/SafeImage';
import { StarRatingDisplay } from '@/src/components/common/StarRating';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Skeleton } from '@/src/components/ui/SwitchAndSkeleton';
import { formatMoney, getProductPrice, useCart } from './CartContext';

export function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { currency, setCurrency, addItem, openCart, openAuthPrompt, totalCount } = useCart();

  useEffect(() => {
    document.title = `${t('myProductsTitle')} — Pramesh Bhattarai`;
  }, [t]);

  const allQuery = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => portfolioApi.getProducts(),
  });

  const filteredQuery = useQuery({
    queryKey: ['products', selectedCategory, search],
    queryFn: () =>
      portfolioApi.getProducts({
        category:
          selectedCategory !== 'All' && selectedCategory !== '__wishlist__' ? selectedCategory : undefined,
        search: search.trim() || undefined,
      }),
  });

  const wishlistQuery = useQuery({
    queryKey: ['my-wishlist'],
    queryFn: portfolioApi.getMyWishlist,
    enabled: Boolean(user),
  });

  const wishlistIds = useMemo(() => {
    return new Set((wishlistQuery.data || []).map((p) => p.id));
  }, [wishlistQuery.data]);

  const toggleWishlistMutation = useMutation({
    mutationFn: (productId: number) => portfolioApi.toggleWishlist(productId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['my-wishlist'] });
      toast.success(res.wishlisted ? 'Saved to your wishlist.' : 'Removed from wishlist.');
    },
    onError: () => toast.error('Could not update wishlist.'),
  });

  const categories = useMemo(() => {
    const items = allQuery.data || [];
    return ['All', ...Array.from(new Set(items.map((p) => p.category)))];
  }, [allQuery.data]);

  const products = useMemo(() => {
    const list = filteredQuery.data || [];
    if (selectedCategory === '__wishlist__') {
      return list.filter((p) => wishlistIds.has(p.id));
    }
    return list;
  }, [filteredQuery.data, selectedCategory, wishlistIds]);

  const handleToggleWishlist = (productId: number) => {
    if (!user) {
      openAuthPrompt();
      return;
    }
    toggleWishlistMutation.mutate(productId);
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      {/* Storefront Header */}
      <div className="flex flex-col gap-6 border-b border-zinc-200 dark:border-zinc-800/80 pb-8 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t('myProductsTitle')}
        </h1>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#111114] p-1">
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer ${
                currency === 'USD'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              USD ($)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('NPR')}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer ${
                currency === 'NPR'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              NPR (रू)
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={openCart} className="gap-2">
            <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>{t('cart')}</span>
            <span className="font-mono text-xs tabular-nums">({totalCount})</span>
          </Button>

          {user ? (
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] px-3 py-1.5 text-xs">
              <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <Link
                to={user.role === 'Admin' ? '/admin' : '/dashboard'}
                className="max-w-[160px] truncate text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400"
                title={user.email}
              >
                {user.email}
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer shrink-0"
              >
                {t('navSignOut')}
              </button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={openAuthPrompt} className="gap-1.5">
              <LogIn className="h-3.5 w-3.5" />
              <span>{t('navSignIn')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-100 dark:bg-[#111114] p-1 border border-zinc-200 dark:border-zinc-800">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {cat === 'All' ? t('allCategory') : cat}
            </button>
          ))}
          {user ? (
            <button
              type="button"
              onClick={() => setSelectedCategory('__wishlist__')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === '__wishlist__'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Heart className="h-3.5 w-3.5 text-rose-500" />
              <span>
                {t('wishlistFilter')} ({wishlistIds.size})
              </span>
            </button>
          ) : null}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchProductsPlaceholder')}
            aria-label="Search products"
            className="pl-9"
          />
        </div>
      </div>

      {/* Product Grid */}
      {filteredQuery.isLoading ? (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-14 w-full" />
            </div>
          ))}
        </div>
      ) : filteredQuery.isError ? (
        <div className="mt-10 rounded-xl border border-zinc-200 dark:border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Unable to load products right now.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => filteredQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : products.length === 0 ? (
        <div className="mt-10 rounded-xl border border-zinc-200 dark:border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('noProductsMatch')}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setSelectedCategory('All');
              setSearch('');
            }}
          >
            {t('resetFilters')}
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product, idx) => {
            const unitPrice = getProductPrice(product, currency);
            const inStock = product.isDigital || product.inventoryCount > 0;
            const isWishlisted = wishlistIds.has(product.id);

            return (
              <motion.article
                key={product.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.28, delay: Math.min(idx * 0.05, 0.2) }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800/90 bg-white dark:bg-[#111114] transition-transform duration-200 hover:-translate-y-0.5 hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <button
                  type="button"
                  onClick={() => handleToggleWishlist(product.id)}
                  aria-label={isWishlisted ? t('removeFromWishlist') : t('addToWishlist')}
                  title={isWishlisted ? t('removeFromWishlist') : t('addToWishlist')}
                  className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white/90 dark:bg-[#111114]/90 backdrop-blur-xs text-zinc-500 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  <Heart
                    className={`h-4 w-4 transition-colors ${
                      isWishlisted ? 'fill-rose-500 text-rose-500' : ''
                    }`}
                  />
                </button>

                <div>
                  {product.imageUrl ? (
                    <Link
                      to={`/products/${product.slug}`}
                      className="block aspect-[4/3] overflow-hidden border-b border-zinc-100 dark:border-zinc-800/80"
                    >
                      <SafeImage
                        src={product.imageUrl}
                        alt={product.title}
                        fallbackTitle={product.title}
                        fallbackSubtitle={product.category}
                        className="h-full w-full"
                        imgClassName="transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </Link>
                  ) : (
                    <Link
                      to={`/products/${product.slug}`}
                      className="relative flex aspect-[4/3] flex-col justify-between overflow-hidden border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/90 dark:bg-[#0B0B0E] p-6 pr-14"
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 opacity-[0.3] dark:opacity-[0.2]"
                        style={{
                          backgroundImage:
                            'radial-gradient(circle at 1px 1px, rgb(161 161 170 / 0.35) 1px, transparent 0)',
                          backgroundSize: '18px 18px',
                        }}
                      />
                      <div className="relative flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1.5 font-mono">
                          {product.hasPdf ? (
                            <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Package className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          )}
                          <span>{product.sku}</span>
                        </span>
                        <span className="font-mono tabular-nums">
                          {product.hasPdf
                            ? t('pdfBooksBadge')
                            : product.isDigital
                              ? t('digitalDelivery')
                              : `${product.inventoryCount} left`}
                        </span>
                      </div>
                      <div className="relative space-y-1.5">
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {product.hasPdf ? t('pdfDownloadIncluded') : t('whatIsIncluded')}
                        </p>
                        <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                          {product.features.slice(0, 3).map((feat, i) => (
                            <li key={i} className="truncate">
                              · {feat}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Link>
                  )}

                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{product.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{inStock ? t('inStock') : t('soldOut')}</span>
                      {product.hasPdf ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">{t('pdfBooksBadge')}</span>
                        </>
                      ) : null}
                    </div>

                    <Link to={`/products/${product.slug}`} className="block mt-2">
                      <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {product.title}
                      </h2>
                    </Link>

                    <div className="mt-2">
                      <StarRatingDisplay
                        rating={product.averageRating || 0}
                        count={product.reviewCount || 0}
                      />
                    </div>

                    <p className="mt-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-3">
                      {product.shortDescription}
                    </p>
                  </div>
                </div>

                <div className="border-t border-zinc-100 dark:border-zinc-800/80 px-6 py-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatMoney(unitPrice, currency)}
                    </p>
                    {currency === 'USD' && product.compareAtUsd ? (
                      <p className="font-mono text-xs line-through text-zinc-400 tabular-nums">
                        ${product.compareAtUsd.toFixed(2)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild className="px-2.5 text-xs">
                      <Link to={`/products/${product.slug}`} aria-label={`Inspect ${product.title}`}>
                        <span>{t('details')}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      disabled={!inStock}
                      onClick={() => addItem(product, 1, false)}
                      className="text-xs"
                    >
                      {inStock ? t('addToCart') : t('unavailable')}
                    </Button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
