import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, CheckCircle2, Download, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/src/app/providers/AuthProvider';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import { Button } from '@/src/components/ui/Button';
import { formatMoney, useCart } from './CartContext';
import { submitEsewaForm } from './esewaFormSubmit';

export function EsewaSuccessPage() {
  const [searchParams] = useSearchParams();
  const encodedData = searchParams.get('data') || '';
  const { clearCart } = useCart();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const verifyMutation = useMutation({
    mutationFn: (data: string) => portfolioApi.verifyEsewaPayment(data),
    onSuccess: (receipt) => {
      clearCart();
      toast.success(`Payment verified for ${receipt.orderNumber}.`);
    },
  });

  useEffect(() => {
    document.title = 'eSewa Payment Verification — Pramesh Bhattarai';
    if (encodedData && verifyMutation.status === 'idle') {
      verifyMutation.mutate(encodedData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encodedData]);

  if (!encodedData) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center space-y-4">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Missing Payment Payload
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No eSewa verification token was provided in the callback URL.
        </p>
        <Button asChild>
          <Link to="/products">Return to Products</Link>
        </Button>
      </div>
    );
  }

  if (verifyMutation.isPending || verifyMutation.status === 'idle') {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center space-y-4">
        <Loader2 className="mx-auto h-9 w-9 animate-spin text-blue-600 dark:text-blue-400" />
        <h1 className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Verifying eSewa Payment
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Confirming signature and transaction status with eSewa servers...
        </p>
      </div>
    );
  }

  if (verifyMutation.isError || !verifyMutation.data) {
    const errMsg =
      (verifyMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'We could not verify this eSewa transaction yet.';

    return (
      <div className="mx-auto max-w-2xl px-6 py-20">
        <div className="rounded-xl border border-red-500/30 bg-white dark:bg-[#111114] p-8 text-center space-y-5">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <div>
            <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Payment Verification Failed
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{errMsg}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" onClick={() => verifyMutation.mutate(encodedData)}>
              <RefreshCw className="h-4 w-4" />
              <span>Retry Verification</span>
            </Button>
            <Button asChild>
              <Link to="/products">{t('backToProducts')}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const receipt = verifyMutation.data;

  const handleDownloadPdf = async (productId: number, title: string) => {
    setDownloadingId(productId);
    try {
      await portfolioApi.downloadPurchasedPdf(receipt.orderNumber, productId, title);
      toast.success(`Downloaded ${title}.`);
    } catch {
      toast.error('Please sign in with your order account to download this PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-7 sm:p-9 space-y-6">
        <div className="flex items-start gap-3.5">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
              eSewa Transaction Verified
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Order {receipt.orderNumber} Paid
            </h1>
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              Your eSewa payment has been verified and confirmed. Delivery details will be sent to your email.
            </p>
          </div>
        </div>

        <dl className="divide-y divide-zinc-200 dark:divide-zinc-800 border-t border-b border-zinc-200 dark:border-zinc-800 text-sm">
          <div className="flex items-center justify-between py-3">
            <dt className="text-zinc-500 dark:text-zinc-400">Order Number</dt>
            <dd className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{receipt.orderNumber}</dd>
          </div>
          {receipt.providerRefId ? (
            <div className="flex items-center justify-between py-3">
              <dt className="text-zinc-500 dark:text-zinc-400">eSewa Reference ID</dt>
              <dd className="font-mono text-zinc-900 dark:text-zinc-100">{receipt.providerRefId}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between py-3">
            <dt className="text-zinc-500 dark:text-zinc-400">Amount Paid</dt>
            <dd className="font-mono font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatMoney(receipt.totalAmount, receipt.currency)}
            </dd>
          </div>
        </dl>

        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">Purchased Items</p>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-sm">
            {receipt.items.map((item) => (
              <div key={item.productId} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.title}</p>
                  <p className="font-mono text-xs text-zinc-500 tabular-nums">
                    {item.sku} · Qty {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatMoney(item.unitPrice * item.quantity, receipt.currency)}
                  </span>
                  {item.hasPdf && user ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloadingId === item.productId}
                      onClick={() => handleDownloadPdf(item.productId, item.title)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>
                        {downloadingId === item.productId ? t('downloadingPdf') : t('downloadPdf')}
                      </span>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link to="/dashboard">
              <span>View My Orders &amp; PDF Library</span>
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/products">
              <ArrowLeft className="h-4 w-4" />
              <span>{t('backToProducts')}</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EsewaFailurePage() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order') || '';

  useEffect(() => {
    document.title = 'eSewa Payment Cancelled — Pramesh Bhattarai';
  }, []);

  const receiptQuery = useQuery({
    queryKey: ['order-receipt', orderNumber],
    queryFn: () => portfolioApi.getOrderReceipt(orderNumber),
    enabled: Boolean(orderNumber),
  });

  const retryMutation = useMutation({
    mutationFn: () => portfolioApi.initiateEsewaPayment(orderNumber),
    onSuccess: (res) => {
      submitEsewaForm(res.esewa);
    },
    onError: () => toast.error('Unable to restart eSewa checkout.'),
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-8 text-center space-y-5">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            eSewa Payment Not Completed
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            The payment was cancelled or failed at the eSewa gateway. No charges were finalized.
          </p>
          {receiptQuery.data ? (
            <p className="mt-2 font-mono text-xs text-zinc-500 tabular-nums">
              Order {receiptQuery.data.orderNumber} · {formatMoney(receiptQuery.data.totalAmount, receiptQuery.data.currency)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {orderNumber && receiptQuery.data?.status === 'pending' ? (
            <Button onClick={() => retryMutation.mutate()} disabled={retryMutation.isPending}>
              <RefreshCw className="h-4 w-4" />
              <span>{retryMutation.isPending ? 'Connecting to eSewa...' : 'Retry eSewa Payment'}</span>
            </Button>
          ) : null}
          <Button variant="outline" asChild>
            <Link to="/products">Back to Products</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
