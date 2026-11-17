import { useEffect, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowUpRight, CheckCircle2, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useAuth } from '@/src/app/providers/AuthProvider';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import { Button } from '@/src/components/ui/Button';
import { Input, Textarea } from '@/src/components/ui/Input';
import type { EsewaInitiationDto, OrderReceiptDto, StorePaymentMethod } from '@/src/types/portfolio';
import { formatMoney, getProductPrice, useCart } from './CartContext';
import { submitEsewaForm } from './esewaFormSubmit';

const PAYMENT_OPTIONS: { id: StorePaymentMethod; label: string; hint: string }[] = [
  { id: 'esewa', label: 'eSewa', hint: 'Instant Nepal wallet payment' },
  { id: 'khalti', label: 'Khalti', hint: 'Digital wallet & mobile banking' },
  { id: 'stripe', label: 'Card / Stripe', hint: 'International debit or credit card' },
  { id: 'bank_transfer', label: 'Bank / COD', hint: 'Direct transfer or cash on delivery' },
];

export function CartDrawer() {
  const {
    items,
    currency,
    setCurrency,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
    totalCount,
    subtotal,
  } = useCart();

  const { user } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<'cart' | 'checkout' | 'esewa_redirect' | 'receipt'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<StorePaymentMethod>('esewa');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<OrderReceiptDto | null>(null);
  const [pendingEsewa, setPendingEsewa] = useState<{
    orderNumber: string;
    totalNpr: number;
    esewa: EsewaInitiationDto;
  } | null>(null);

  useEffect(() => {
    if (user) {
      setCustomerEmail((prev) => prev || user.email);
      setCustomerName((prev) => prev || user.fullName);
    }
  }, [user]);

  const hasPhysicalItems = items.some((entry) => !entry.product.isDigital);
  const nprSubtotal = items.reduce((acc, entry) => acc + entry.product.priceNpr * entry.quantity, 0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCartOpen) closeCart();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCartOpen, closeCart]);

  useEffect(() => {
    if (!isCartOpen && (step === 'receipt' || step === 'esewa_redirect')) {
      setStep('cart');
      setReceipt(null);
      setPendingEsewa(null);
    }
  }, [isCartOpen, step]);

  const orderMutation = useMutation({
    mutationFn: () =>
      portfolioApi.submitOrder({
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress: hasPhysicalItems ? shippingAddress : undefined,
        paymentMethod,
        currency: paymentMethod === 'esewa' ? 'NPR' : currency,
        notes: notes || undefined,
        items: items.map((entry) => ({
          productId: entry.product.id,
          quantity: entry.quantity,
        })),
      }),
    onSuccess: (data) => {
      clearCart();
      setNotes('');
      if (data.esewa) {
        setPendingEsewa({
          orderNumber: data.orderNumber,
          totalNpr: data.totalAmount,
          esewa: data.esewa,
        });
        setStep('esewa_redirect');
        toast.success(`Redirecting to eSewa for order ${data.orderNumber}...`);
        submitEsewaForm(data.esewa);
        return;
      }
      setReceipt(data);
      setStep('receipt');
      toast.success(`Order ${data.orderNumber} confirmed.`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not complete your order. Please verify all fields.';
      toast.error(msg);
    },
  });

  if (!isCartOpen) return null;

  const handleCheckoutSubmit = (e: FormEvent) => {
    e.preventDefault();
    orderMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs" role="dialog" aria-modal="true" aria-label="Shopping Cart">
      <div className="fixed inset-0" onClick={closeCart} aria-hidden="true" />

      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0D0D10] text-zinc-900 dark:text-zinc-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="font-display text-base font-semibold">
              {step === 'cart' && `${t('shoppingCart')} (${totalCount})`}
              {step === 'checkout' && t('checkoutDetails')}
              {step === 'esewa_redirect' && t('continueToEsewa')}
              {step === 'receipt' && t('orderConfirmed')}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {step !== 'receipt' && step !== 'esewa_redirect' ? (
              <div className="flex items-center rounded-md border border-zinc-200 dark:border-zinc-800 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-2 py-1 rounded-xs font-mono cursor-pointer transition-colors ${
                    currency === 'USD'
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  USD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('NPR')}
                  className={`px-2 py-1 rounded-xs font-mono cursor-pointer transition-colors ${
                    currency === 'NPR'
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  NPR
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={closeCart}
              aria-label="Close cart drawer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'esewa_redirect' && pendingEsewa ? (
            <div className="space-y-6 py-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-2">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Order {pendingEsewa.orderNumber} Ready for eSewa
                </p>
                <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Redirecting to the eSewa {pendingEsewa.esewa.mode === 'sandbox' ? 'UAT Sandbox' : 'Payment'} gateway for{' '}
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatMoney(pendingEsewa.totalNpr, 'NPR')}
                  </span>
                  . If your browser does not redirect automatically, click below.
                </p>
              </div>

              <div className="space-y-3">
                <Button className="w-full" onClick={() => submitEsewaForm(pendingEsewa.esewa)}>
                  <span>{t('continueToEsewa')}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setStep('cart');
                    setPendingEsewa(null);
                    closeCart();
                  }}
                >
                  Close Drawer
                </Button>
              </div>
            </div>
          ) : step === 'receipt' && receipt ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Order {receipt.orderNumber} Confirmed
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                      Your order has been logged and delivery instructions will be sent to{' '}
                      <span className="font-medium text-zinc-900 dark:text-zinc-200">{customerEmail}</span>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Order Summary</p>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-sm">
                  {receipt.items.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between gap-4 py-2.5">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.title}</p>
                        <p className="font-mono text-xs text-zinc-500 tabular-nums">
                          {item.sku} · Qty {item.quantity}
                        </p>
                      </div>
                      <span className="font-mono text-sm tabular-nums text-zinc-900 dark:text-zinc-100">
                        {formatMoney(item.unitPrice * item.quantity, receipt.currency)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-3 text-sm font-semibold">
                  <span>Total ({receipt.paymentMethod.toUpperCase()})</span>
                  <span className="font-mono tabular-nums">
                    {formatMoney(receipt.totalAmount, receipt.currency)}
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  setStep('cart');
                  setReceipt(null);
                  closeCart();
                }}
              >
                {t('continueBrowsing')}
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
              <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">{t('cartEmptyTitle')}</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
                {t('cartEmptyDesc')}
              </p>
              <Button variant="outline" size="sm" className="mt-5" onClick={closeCart}>
                {t('browseProductsBtn')}
              </Button>
            </div>
          ) : step === 'cart' ? (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {items.map((entry) => {
                const unitPrice = getProductPrice(entry.product, currency);
                return (
                  <div key={entry.product.id} className="py-4 first:pt-0 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {entry.product.category} · {entry.product.isDigital ? 'Digital' : 'Physical'}
                        </p>
                        <h3 className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {entry.product.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(entry.product.id)}
                        aria-label={`Remove ${entry.product.title}`}
                        className="text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => updateQuantity(entry.product.id, entry.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="h-8 w-8 inline-flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center font-mono text-xs tabular-nums">{entry.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(entry.product.id, entry.quantity + 1)}
                          aria-label="Increase quantity"
                          className="h-8 w-8 inline-flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <p className="font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {formatMoney(unitPrice * entry.quantity, currency)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium block mb-1">Full Name *</label>
                <Input
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Delivery Email *</label>
                <Input
                  required
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Phone Number *</label>
                <Input
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+977 98XXXXXXXX"
                />
              </div>

              {hasPhysicalItems ? (
                <div>
                  <label className="text-xs font-medium block mb-1">Shipping Address *</label>
                  <Input
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Street, City, Postal Code"
                  />
                </div>
              ) : null}

              <div>
                <label className="text-xs font-medium block mb-2">Payment Method *</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPaymentMethod(opt.id)}
                      className={`rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                        paymentMethod === opt.id
                          ? 'border-blue-600 bg-blue-600/10 text-zinc-900 dark:text-zinc-50'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <p className="text-xs font-semibold">{opt.label}</p>
                      <p className="mt-0.5 text-[11px] opacity-80 leading-snug">{opt.hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'esewa' ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 space-y-1.5">
                  <p>
                    eSewa settles in Nepalese Rupees. Total payable:{' '}
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                      {formatMoney(nprSubtotal, 'NPR')}
                    </span>
                    . You will be redirected to eSewa ePay to authorize payment.
                  </p>
                  <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                    UAT Test Login: 9806800001 · Pass: Nepal@123 · OTP: 123456
                  </p>
                </div>
              ) : null}

              <div>
                <label className="text-xs font-medium block mb-1">Order Notes (Optional)</label>
                <Textarea
                  className="min-h-[72px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Project requirements, preferred schedule, or delivery notes..."
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && step !== 'receipt' && step !== 'esewa_redirect' ? (
          <div className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 space-y-3 bg-zinc-50/70 dark:bg-[#09090B]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                {step === 'checkout' && paymentMethod === 'esewa' ? 'Payable via eSewa (NPR)' : `Subtotal (${currency})`}
              </span>
              <span className="font-mono text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                {step === 'checkout' && paymentMethod === 'esewa'
                  ? formatMoney(nprSubtotal, 'NPR')
                  : formatMoney(subtotal, currency)}
              </span>
            </div>

            {step === 'cart' ? (
              <Button className="w-full" onClick={() => setStep('checkout')}>
                {t('proceedToCheckout')}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('cart')}>
                  {t('backToCart')}
                </Button>
                <Button
                  type="submit"
                  form="checkout-form"
                  className="flex-1"
                  disabled={orderMutation.isPending}
                >
                  {orderMutation.isPending
                    ? 'Processing...'
                    : paymentMethod === 'esewa'
                      ? t('payWithEsewa')
                      : t('placeOrder')}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
