import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  Download,
  ExternalLink,
  Heart,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Minus,
  MoreVertical,
  Package,
  Phone,
  Plus,
  Radio,
  Receipt,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  User,
  Video,
  X,
} from 'lucide-react';
import { useAuth } from '@/src/app/providers/AuthProvider';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { adminApi } from '@/src/services/api/adminApi';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import { buildWebSocketUrl, getOrCreateChatSessionToken } from '@/src/utils/analytics';
import { StudentPortalWorkspace } from '@/src/features/academy/StudentPortalPanels';
import {
  CallSessionModal,
  ChatMessageMedia,
  VoiceRecorderButton,
  useWebRtcCallManager,
} from '@/src/components/common/RealtimeMediaTools';
import { LanguageToggle } from '@/src/components/common/LanguageToggle';
import { StarRatingDisplay } from '@/src/components/common/StarRating';
import { ThemeToggle } from '@/src/components/common/ThemeToggle';
import { SafeImage } from '@/src/components/common/SafeImage';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import { Input, PasswordInput, Textarea } from '@/src/components/ui/Input';
import { Skeleton } from '@/src/components/ui/SwitchAndSkeleton';
import { formatMoney, getProductPrice, useCart } from '@/src/features/products/CartContext';
import { submitEsewaForm } from '@/src/features/products/esewaFormSubmit';
import type { ChatMessageDto, StorePaymentMethod } from '@/src/types/portfolio';

type UserTab =
  | 'overview'
  | 'classroom'
  | 'videos'
  | 'attendance'
  | 'facilities'
  | 'messages'
  | 'shop'
  | 'library'
  | 'wishlist'
  | 'cart'
  | 'orders'
  | 'emails'
  | 'security';

function UserMessagesCallsWorkspace({ fullName, email }: { fullName: string; email: string }) {
  const [sessionToken] = useState(() => getOrCreateChatSessionToken());
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const callMgr = useWebRtcCallManager({
    wsRef,
    localName: fullName,
    sessionToken,
  });
  const callSignalRef = useRef(callMgr.handleWsSignal);
  callSignalRef.current = callMgr.handleWsSignal;

  useEffect(() => {
    let cancelled = false;
    portfolioApi
      .initChatSession({
        sessionToken,
        visitorName: fullName,
        visitorEmail: email,
      })
      .then((res) => {
        if (!cancelled) setMessages(res.messages);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [sessionToken, fullName, email]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let unmounted = false;
    try {
      ws = new WebSocket(buildWebSocketUrl({ sessionToken }));
      wsRef.current = ws;
      ws.onopen = () => {
        if (!unmounted) setConnected(true);
      };
      ws.onclose = () => {
        if (!unmounted) {
          setConnected(false);
          if (wsRef.current === ws) wsRef.current = null;
        }
      };
      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(String(evt.data || '{}')) as {
            type?: string;
            message?: ChatMessageDto;
            ack?: boolean;
            callId?: number;
            callType?: 'audio' | 'video';
            callerName?: string;
            sessionToken?: string;
            classSessionId?: number;
            sdp?: RTCSessionDescriptionInit;
            candidate?: RTCIceCandidateInit;
          };
          if (data.type === 'chat:message' && data.message) {
            const incoming = data.message;
            setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
          }
          if (data.type?.startsWith('call:') || data.type?.startsWith('webrtc:')) {
            void callSignalRef.current(data);
          }
        } catch {
          // Ignore malformed WS payloads
        }
      };
    } catch {
      setConnected(false);
    }
    return () => {
      unmounted = true;
      if (ws && ws.readyState <= WebSocket.OPEN) ws.close();
      wsRef.current = null;
    };
  }, [sessionToken]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const saved = await portfolioApi.sendChatMessage({
        sessionToken,
        visitorName: fullName,
        visitorEmail: email,
        message: trimmed,
      });
      setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
      setMessageInput('');
    } catch {
      toast.error('Unable to send message right now.');
    } finally {
      setSending(false);
    }
  };

  const handleSendVoice = async (file: File, durationSec: number) => {
    const saved = await portfolioApi.uploadChatVoice({
      sessionToken,
      visitorName: fullName,
      visitorEmail: email,
      file,
      durationSec,
    });
    setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <h2 className="text-base font-semibold">Direct Chat, Voice Notes, Audio &amp; Video Calls</h2>
            </div>
            <p className="text-xs text-zinc-500">
              Instant real-time messaging, microphone voice notes, and peer-to-peer WebRTC calls with Pramesh Support.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void callMgr.startOutgoingCall('audio', 'Pramesh Support')}
            >
              <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Audio Call</span>
            </Button>
            <Button
              size="sm"
              onClick={() => void callMgr.startOutgoingCall('video', 'Pramesh Support')}
            >
              <Video className="h-3.5 w-3.5" />
              <span>Video Call</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col h-[460px] overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50 dark:bg-[#09090B]">
              {messages.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-16">
                  Start a conversation, send a voice recording, or click Audio / Video Call above.
                </p>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.senderRole === 'visitor';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[78%] rounded-xl px-3.5 py-2.5 text-xs ${
                          isOwn
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {!isOwn ? (
                          <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
                            {msg.senderName}
                          </p>
                        ) : null}
                        <ChatMessageMedia
                          messageType={msg.messageType}
                          message={msg.message}
                          mediaUrl={msg.mediaUrl}
                          mediaDurationSec={msg.mediaDurationSec}
                          isOwnBubble={isOwn}
                        />
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            <form
              onSubmit={handleSend}
              className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 bg-white dark:bg-[#111114]"
            >
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Write a message to support or instructors..."
                className="h-9 text-xs"
                maxLength={2000}
              />
              <VoiceRecorderButton onSendVoice={handleSendVoice} />
              <Button type="submit" size="sm" disabled={sending || !messageInput.trim()}>
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <CallSessionModal
        callState={callMgr.callState}
        micMuted={callMgr.micMuted}
        cameraOff={callMgr.cameraOff}
        elapsedSeconds={callMgr.elapsedSeconds}
        localVideoRef={callMgr.localVideoRef}
        remoteVideoRef={callMgr.remoteVideoRef}
        remoteAudioRef={callMgr.remoteAudioRef}
        onAccept={callMgr.acceptIncomingCall}
        onEnd={callMgr.declineOrEndCall}
        onToggleMute={callMgr.toggleMute}
        onToggleCamera={callMgr.toggleCamera}
        onRetryMedia={callMgr.retryLocalMedia}
      />
    </div>
  );
}

const PAYMENT_OPTIONS: { id: StorePaymentMethod; label: string; hint: string }[] = [
  { id: 'esewa', label: 'eSewa', hint: 'Instant Nepal wallet payment' },
  { id: 'khalti', label: 'Khalti', hint: 'Digital wallet & mobile banking' },
  { id: 'stripe', label: 'Card / Stripe', hint: 'International debit or credit card' },
  { id: 'bank_transfer', label: 'Bank / COD', hint: 'Direct transfer or cash on delivery' },
];

export function UserDashboardPage() {
  const { user, isLoading: authLoading, updateProfile, logout } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const {
    items,
    currency,
    setCurrency,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    totalCount,
    subtotal,
  } = useCart();

  const [activeTab, setActiveTab] = useState<UserTab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  // Shop filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  // Checkout state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<StorePaymentMethod>('esewa');
  const [notes, setNotes] = useState('');

  // Profile & password change state
  const [profileFullName, setProfileFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    document.title = `${t('navMyDashboard')} — Pramesh Bhattarai`;
  }, [t]);

  useEffect(() => {
    if (user) {
      setCustomerName((prev) => prev || user.fullName);
      setCustomerEmail((prev) => prev || user.email);
      setProfileFullName((prev) => prev || user.fullName);
    }
  }, [user]);

  const overviewQuery = useQuery({
    queryKey: ['my-overview'],
    queryFn: portfolioApi.getMyOverview,
    enabled: Boolean(user),
  });

  const productsQuery = useQuery({
    queryKey: ['products', 'dashboard'],
    queryFn: () => portfolioApi.getProducts(),
    enabled: Boolean(user),
  });

  const wishlistQuery = useQuery({
    queryKey: ['my-wishlist'],
    queryFn: portfolioApi.getMyWishlist,
    enabled: Boolean(user),
  });

  const libraryQuery = useQuery({
    queryKey: ['my-library'],
    queryFn: portfolioApi.getMyLibrary,
    enabled: Boolean(user),
  });

  const ordersQuery = useQuery({
    queryKey: ['my-orders'],
    queryFn: portfolioApi.getMyOrders,
    enabled: Boolean(user),
  });

  const emailsQuery = useQuery({
    queryKey: ['my-emails'],
    queryFn: portfolioApi.getMyEmails,
    enabled: Boolean(user),
  });

  const toggleWishlistMutation = useMutation({
    mutationFn: (productId: number) => portfolioApi.toggleWishlist(productId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['my-wishlist'] });
      toast.success(res.wishlisted ? 'Saved to wishlist.' : 'Removed from wishlist.');
    },
    onError: () => toast.error('Could not update wishlist.'),
  });

  const wishlistIds = useMemo(() => new Set((wishlistQuery.data || []).map((p) => p.id)), [wishlistQuery.data]);
  const librarySet = useMemo(
    () => new Set((libraryQuery.data || []).map((entry) => `${entry.orderNumber}:${entry.productId}`)),
    [libraryQuery.data]
  );

  const hasPhysicalItems = items.some((entry) => !entry.product.isDigital);
  const nprSubtotal = items.reduce((acc, entry) => acc + entry.product.priceNpr * entry.quantity, 0);

  const checkoutMutation = useMutation({
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
      qc.invalidateQueries({ queryKey: ['my-overview'] });
      qc.invalidateQueries({ queryKey: ['my-orders'] });
      qc.invalidateQueries({ queryKey: ['my-emails'] });
      qc.invalidateQueries({ queryKey: ['my-library'] });
      if (data.esewa) {
        toast.success(`Order ${data.orderNumber} ready. Redirecting to eSewa...`);
        submitEsewaForm(data.esewa);
        return;
      }
      toast.success(`Order ${data.orderNumber} confirmed.`);
      setActiveTab('orders');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not complete your order. Please verify all required fields.';
      toast.error(msg);
    },
  });

  const payOrderWithEsewa = useMutation({
    mutationFn: (orderNumber: string) => portfolioApi.initiateEsewaPayment(orderNumber),
    onSuccess: (data) => {
      toast.success(`Redirecting to eSewa for ${data.orderNumber}...`);
      submitEsewaForm(data.esewa);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to start eSewa payment for this order.';
      toast.error(msg);
    },
  });

  const profileMutation = useMutation({
    mutationFn: () => updateProfile(profileFullName.trim()),
    onSuccess: (updated) => {
      setCustomerName(updated.fullName);
      toast.success('Profile updated.');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not update profile.';
      toast.error(msg);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => adminApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast.success('Account password updated.');
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

  const handleDownloadPdf = async (orderNumber: string, productId: number, title: string) => {
    const key = `${orderNumber}:${productId}`;
    setDownloadingKey(key);
    try {
      await portfolioApi.downloadPurchasedPdf(orderNumber, productId, title);
      toast.success(`Downloaded ${title}.`);
    } catch {
      toast.error('Could not download PDF. Make sure payment is confirmed.');
    } finally {
      setDownloadingKey(null);
    }
  };

  const categories = useMemo(() => {
    const all = productsQuery.data || [];
    return ['All', ...Array.from(new Set(all.map((p) => p.category)))];
  }, [productsQuery.data]);

  const filteredProducts = useMemo(() => {
    const all = productsQuery.data || [];
    const q = search.trim().toLowerCase();
    return all.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [productsQuery.data, selectedCategory, search]);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const overview = overviewQuery.data;

  const navItems: { id: UserTab; label: string; icon: typeof LayoutDashboard; count?: number }[] = [
    { id: 'overview', label: t('tabOverview'), icon: LayoutDashboard },
    { id: 'classroom', label: t('tabStudentPortal'), icon: Radio },
    { id: 'videos', label: t('tabClassVideos'), icon: Video },
    { id: 'attendance', label: t('tabAttendance'), icon: ClipboardCheck },
    { id: 'facilities', label: t('tabAssignmentsNotices'), icon: CalendarClock },
    { id: 'messages', label: t('tabMessagesCalls'), icon: MessageSquare },
    { id: 'shop', label: t('tabShop'), icon: ShoppingBag, count: productsQuery.data?.length },
    { id: 'library', label: t('tabLibrary'), icon: BookOpen, count: libraryQuery.data?.length },
    { id: 'wishlist', label: t('tabWishlist'), icon: Heart, count: wishlistQuery.data?.length },
    { id: 'cart', label: t('tabCart'), icon: ShoppingCart, count: totalCount },
    { id: 'orders', label: t('tabOrders'), icon: Receipt, count: overview?.ordersCount },
    { id: 'emails', label: t('tabEmails'), icon: Mail, count: overview?.emailsCount },
    { id: 'security', label: t('tabSecurity'), icon: KeyRound },
  ];

  const handleSelectTab = (tab: UserTab) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
  };

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    passwordMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 flex flex-col md:flex-row">
      {/* Vertical Sidebar matching Admin Dashboard */}
      <aside
        className={`${
          mobileNavOpen ? 'flex' : 'hidden'
        } md:flex w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0B0D] p-5 flex-col justify-between md:sticky md:top-0 md:h-screen md:overflow-y-auto`}
      >
        <div>
          <div className="flex items-center justify-between pb-5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="min-w-0">
              <p className="font-display text-base font-bold">{t('customerPortal')}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close portal sidebar"
              className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav aria-label="User dashboard navigation" className="mt-5 flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {typeof item.count === 'number' ? (
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        active ? 'text-blue-100' : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {item.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-2 pt-6 mt-6 border-t border-zinc-200 dark:border-zinc-800">
          {user.role === 'Admin' ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{t('adminCms')}</span>
              </Link>
            </Button>
          ) : null}
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{t('viewPortfolioSite')}</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => logout()}>
            <LogOut className="h-4 w-4" />
            <span>{t('navSignOut')}</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0B0D] px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label={mobileNavOpen ? 'Close portal sidebar' : 'Open portal sidebar'}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer shrink-0"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <MoreVertical className="h-4 w-4" />}
            </button>
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate">
              Portal / {navItems.find((n) => n.id === activeTab)?.label}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#111114] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-2 py-1 rounded-md font-mono cursor-pointer transition-colors ${
                  currency === 'USD'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-500'
                }`}
              >
                USD
              </button>
              <button
                type="button"
                onClick={() => setCurrency('NPR')}
                className={`px-2 py-1 rounded-md font-mono cursor-pointer transition-colors ${
                  currency === 'NPR'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-500'
                }`}
              >
                NPR
              </button>
            </div>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <main className="p-6 max-w-6xl w-full space-y-6">
          {activeTab === 'overview' ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {t('welcomePrefix')}, {user.fullName}
                  </h1>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Browse products &amp; PDF books, save wishlist items, complete payments, and track emails sent to{' '}
                    {user.email}.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setActiveTab('shop')}>
                    {t('browseMyProducts')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('cart')}>
                    {t('cart')} ({totalCount})
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('library')}
                  className="text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-4 hover:border-blue-500/60 transition-colors cursor-pointer"
                >
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('tabLibrary')}</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                    {libraryQuery.data?.length ?? 0}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">{t('downloadPdf')}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('wishlist')}
                  className="text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-4 hover:border-blue-500/60 transition-colors cursor-pointer"
                >
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('tabWishlist')}</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{wishlistQuery.data?.length ?? 0}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{t('wishlistFilter')}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-4 hover:border-blue-500/60 transition-colors cursor-pointer"
                >
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('myOrdersStat')}</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{overview?.ordersCount ?? 0}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {overview?.pendingOrdersCount ?? 0} {t('pendingPaymentStat').toLowerCase()}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('emails')}
                  className="text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-4 hover:border-blue-500/60 transition-colors cursor-pointer"
                >
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('accountEmailsStat')}</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{overview?.emailsCount ?? 0}</p>
                  <p className="mt-1 text-[11px] text-zinc-500 truncate">{user.email}</p>
                </button>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <h2 className="text-base font-semibold">{t('recentOrders')}</h2>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('orders')}>
                    {t('viewAll')}
                  </Button>
                </CardHeader>
                <CardContent>
                  {!overview || overview.recentOrders.length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      No orders placed yet. Open {t('tabShop')} to add items and checkout.
                    </p>
                  ) : (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                      {overview.recentOrders.map((ord) => (
                        <div key={ord.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                          <div>
                            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                              {ord.orderNumber}
                            </span>{' '}
                            <span className="text-zinc-500">· {ord.paymentMethod.toUpperCase()}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-semibold tabular-nums">
                              {formatMoney(ord.totalAmount, ord.currency)}
                            </span>
                            <span className="font-mono uppercase text-[11px] text-blue-600 dark:text-blue-400">
                              {ord.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {activeTab === 'classroom' ? <StudentPortalWorkspace section="classroom" /> : null}
          {activeTab === 'videos' ? <StudentPortalWorkspace section="videos" /> : null}
          {activeTab === 'attendance' ? <StudentPortalWorkspace section="attendance" /> : null}
          {activeTab === 'facilities' ? <StudentPortalWorkspace section="facilities" /> : null}
          {activeTab === 'messages' ? (
            <UserMessagesCallsWorkspace fullName={user.fullName} email={user.email} />
          ) : null}

          {activeTab === 'shop' ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-xl font-bold">{t('myProductsTitle')}</h1>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Adding any item sends a confirmation email to {user.email}.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('searchProductsPlaceholder')}
                      className="pl-9"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('cart')}>
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>
                      {t('cart')} ({totalCount})
                    </span>
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-100 dark:bg-[#111114] p-1 border border-zinc-200 dark:border-zinc-800 w-fit">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {cat === 'All' ? t('allCategory') : cat}
                  </button>
                ))}
              </div>

              {productsQuery.isLoading ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((n) => (
                    <Skeleton key={n} className="h-72 w-full" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-zinc-500">{t('noProductsMatch')}</CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredProducts.map((product) => {
                    const unitPrice = getProductPrice(product, currency);
                    const inStock = product.isDigital || product.inventoryCount > 0;
                    const wishlisted = wishlistIds.has(product.id);
                    return (
                      <article
                        key={product.id}
                        className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114]"
                      >
                        <button
                          type="button"
                          onClick={() => toggleWishlistMutation.mutate(product.id)}
                          aria-label={wishlisted ? t('removeFromWishlist') : t('addToWishlist')}
                          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-[#111114]/90 text-zinc-500 hover:text-rose-500 cursor-pointer"
                        >
                          <Heart className={`h-4 w-4 ${wishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>

                        <div>
                          {product.imageUrl ? (
                            <Link
                              to={`/products/${product.slug}`}
                              className="block aspect-[4/3] overflow-hidden border-b border-zinc-100 dark:border-zinc-800"
                            >
                              <SafeImage
                                src={product.imageUrl}
                                alt={product.title}
                                fallbackTitle={product.title}
                                fallbackSubtitle={product.category}
                                className="h-full w-full"
                              />
                            </Link>
                          ) : (
                            <Link
                              to={`/products/${product.slug}`}
                              className="flex aspect-[4/3] flex-col justify-between border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0B0B0E] p-5 pr-12"
                            >
                              <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
                                <span className="inline-flex items-center gap-1.5">
                                  {product.hasPdf ? (
                                    <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                  ) : (
                                    <Package className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                  )}
                                  {product.sku}
                                </span>
                                <span>
                                  {product.hasPdf
                                    ? t('pdfBooksBadge')
                                    : product.isDigital
                                      ? t('digitalDelivery')
                                      : `${product.inventoryCount} left`}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3">
                                {product.deliveryInfo}
                              </p>
                            </Link>
                          )}

                          <div className="p-5">
                            <p className="text-xs text-zinc-500">
                              {product.category}
                              {product.hasPdf ? ` · ${t('pdfBooksBadge')}` : ''}
                            </p>
                            <Link to={`/products/${product.slug}`} className="block mt-1">
                              <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50 hover:text-blue-600 dark:hover:text-blue-400">
                                {product.title}
                              </h2>
                            </Link>
                            <div className="mt-1.5">
                              <StarRatingDisplay
                                rating={product.averageRating || 0}
                                count={product.reviewCount || 0}
                              />
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-2">
                              {product.shortDescription}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-3.5 flex items-center justify-between gap-2">
                          <span className="font-mono text-sm font-bold tabular-nums">
                            {formatMoney(unitPrice, currency)}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!inStock}
                              onClick={() => addItem(product, 1, false)}
                              className="text-xs"
                            >
                              {t('addToCart')}
                            </Button>
                            <Button
                              size="sm"
                              disabled={!inStock}
                              onClick={() => {
                                addItem(product, 1, false);
                                setActiveTab('cart');
                              }}
                              className="text-xs"
                            >
                              {t('buyNow')}
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {activeTab === 'library' ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">{t('purchasedPdfBooks')}</h2>
                  <p className="text-xs text-zinc-500">{t('purchasedPdfBooksDesc')}</p>
                </div>
                <Button size="sm" onClick={() => setActiveTab('shop')}>
                  {t('browseMyProducts')}
                </Button>
              </CardHeader>
              <CardContent>
                {libraryQuery.isLoading ? (
                  <Skeleton className="h-44 w-full" />
                ) : (libraryQuery.data || []).length === 0 ? (
                  <p className="text-sm text-zinc-500">{t('noPurchasedPdfBooks')}</p>
                ) : (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {(libraryQuery.data || []).map((book) => {
                      const dlKey = `${book.orderNumber}:${book.productId}`;
                      return (
                        <div key={dlKey} className="py-4 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{book.title}</p>
                              <p className="font-mono text-xs text-zinc-500 mt-0.5 tabular-nums">
                                {book.orderNumber} · {book.sku} · {book.category} · {book.purchasedAt}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            disabled={downloadingKey === dlKey}
                            onClick={() => handleDownloadPdf(book.orderNumber, book.productId, book.title)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>{downloadingKey === dlKey ? t('downloadingPdf') : t('downloadPdf')}</span>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {activeTab === 'wishlist' ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">{t('savedWishlistTitle')}</h2>
                  <p className="text-xs text-zinc-500">{t('savedWishlistDesc')}</p>
                </div>
                <Button size="sm" onClick={() => setActiveTab('shop')}>
                  {t('browseMyProducts')}
                </Button>
              </CardHeader>
              <CardContent>
                {wishlistQuery.isLoading ? (
                  <Skeleton className="h-44 w-full" />
                ) : (wishlistQuery.data || []).length === 0 ? (
                  <p className="text-sm text-zinc-500">{t('noWishlistItems')}</p>
                ) : (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {(wishlistQuery.data || []).map((prod) => {
                      const price = getProductPrice(prod, currency);
                      return (
                        <div key={prod.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                          <div className="min-w-0">
                            <Link
                              to={`/products/${prod.slug}`}
                              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {prod.title}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                              <span>{prod.category}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                                {formatMoney(price, currency)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <StarRatingDisplay rating={prod.averageRating || 0} count={prod.reviewCount || 0} />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleWishlistMutation.mutate(prod.id)}
                            >
                              {t('removeWishlistBtn')}
                            </Button>
                            <Button size="sm" onClick={() => addItem(prod, 1, false)}>
                              {t('addToCart')}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {activeTab === 'cart' ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-7">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold">
                      {t('shoppingCart')} ({totalCount})
                    </h2>
                    <p className="text-xs text-zinc-500">Adjust quantities or remove items before payment.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('shop')}>
                    {t('browseMyProducts')}
                  </Button>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <div className="py-10 text-center space-y-3">
                      <p className="text-sm text-zinc-500">{t('cartEmptyTitle')}</p>
                      <Button size="sm" onClick={() => setActiveTab('shop')}>
                        {t('browseProductsBtn')}
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {items.map((entry) => {
                        const unitPrice = getProductPrice(entry.product, currency);
                        return (
                          <div key={entry.product.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{entry.product.title}</p>
                              <p className="text-xs text-zinc-500 font-mono">
                                {entry.product.sku} · {formatMoney(unitPrice, currency)} each
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(entry.product.id, entry.quantity - 1)}
                                  aria-label="Decrease quantity"
                                  className="h-8 w-8 inline-flex items-center justify-center cursor-pointer"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-8 text-center font-mono text-xs tabular-nums">{entry.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(entry.product.id, entry.quantity + 1)}
                                  aria-label="Increase quantity"
                                  className="h-8 w-8 inline-flex items-center justify-center cursor-pointer"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <span className="font-mono text-sm font-semibold tabular-nums w-24 text-right">
                                {formatMoney(unitPrice * entry.quantity, currency)}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeItem(entry.product.id)}
                                aria-label={`Remove ${entry.product.title}`}
                                className="text-zinc-400 hover:text-red-500 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-5">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-base font-semibold">{t('checkoutDetails')}</h2>
                  </div>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      checkoutMutation.mutate();
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-xs font-medium block mb-1">{t('fullName')} *</label>
                      <Input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">{t('emailAddress')} *</label>
                      <Input required type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">Phone Number *</label>
                      <Input required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+977 98XXXXXXXX" />
                    </div>
                    {hasPhysicalItems ? (
                      <div>
                        <label className="text-xs font-medium block mb-1">Shipping Address *</label>
                        <Input required value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Street, City, Postal Code" />
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
                                : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            <p className="text-xs font-semibold">{opt.label}</p>
                            <p className="mt-0.5 text-[11px] opacity-80">{opt.hint}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {paymentMethod === 'esewa' ? (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 space-y-1">
                        <p>
                          Payable via eSewa (NPR):{' '}
                          <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                            {formatMoney(nprSubtotal, 'NPR')}
                          </span>
                        </p>
                        <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                          UAT Test Login: 9806800001 · Pass: Nepal@123 · OTP: 123456
                        </p>
                      </div>
                    ) : null}

                    <div>
                      <label className="text-xs font-medium block mb-1">Order Notes</label>
                      <Textarea className="min-h-[64px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery or setup instructions..." />
                    </div>

                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 flex items-center justify-between text-sm font-semibold">
                      <span>{paymentMethod === 'esewa' ? 'Total (eSewa NPR)' : `Total (${currency})`}</span>
                      <span className="font-mono tabular-nums">
                        {paymentMethod === 'esewa' ? formatMoney(nprSubtotal, 'NPR') : formatMoney(subtotal, currency)}
                      </span>
                    </div>

                    <Button type="submit" className="w-full" disabled={items.length === 0 || checkoutMutation.isPending}>
                      {checkoutMutation.isPending
                        ? 'Processing...'
                        : paymentMethod === 'esewa'
                          ? t('payWithEsewa')
                          : t('placeOrder')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {activeTab === 'orders' ? (
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold">{t('tabOrders')}</h2>
                    <p className="text-xs text-zinc-500">
                      Track status, complete any pending eSewa payments, and download paid PDF books.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setActiveTab('shop')}>
                    {t('browseMyProducts')}
                  </Button>
                </CardHeader>
                <CardContent>
                  {ordersQuery.isLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : (ordersQuery.data || []).length === 0 ? (
                    <p className="text-sm text-zinc-500">No orders placed under {user.email} yet.</p>
                  ) : (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {(ordersQuery.data || []).map((ord) => (
                        <div key={ord.id} className="py-4 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">
                                <span className="font-mono">{ord.orderNumber}</span> ·{' '}
                                <span className="font-mono">{formatMoney(ord.totalAmount, ord.currency)}</span>
                              </p>
                              <p className="font-mono text-[11px] text-zinc-500 mt-0.5">
                                Status: {ord.status.toUpperCase()} · Method: {ord.paymentMethod.toUpperCase()}
                                {ord.providerRefId ? ` · Ref: ${ord.providerRefId}` : ''} · {ord.createdAt}
                              </p>
                            </div>
                            {ord.status === 'pending' ? (
                              <Button
                                size="sm"
                                onClick={() => payOrderWithEsewa.mutate(ord.orderNumber)}
                                disabled={payOrderWithEsewa.isPending}
                              >
                                <span>{t('payWithEsewa')}</span>
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
                            {ord.items.map((item) => {
                              const key = `${ord.orderNumber}:${item.productId}`;
                              const canDownload = librarySet.has(key);
                              return (
                                <div key={item.productId} className="flex flex-wrap items-center justify-between gap-2">
                                  <span>
                                    · {item.title} ({item.sku}) × {item.quantity}
                                  </span>
                                  {canDownload ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={downloadingKey === key}
                                      onClick={() => handleDownloadPdf(ord.orderNumber, item.productId, item.title)}
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      <span>{downloadingKey === key ? t('downloadingPdf') : t('downloadPdf')}</span>
                                    </Button>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Explicit Payment History & Transaction Receipts */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-base font-semibold">{t('paymentHistoryTitle')}</h2>
                  </div>
                </CardHeader>
                <CardContent>
                  {(ordersQuery.data || []).length === 0 ? (
                    <p className="text-xs text-zinc-500">No payment transactions recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                          <tr>
                            <th className="py-2 pr-3 font-medium">Order</th>
                            <th className="py-2 pr-3 font-medium">Method</th>
                            <th className="py-2 pr-3 font-medium">Reference / TX UUID</th>
                            <th className="py-2 pr-3 font-medium">Amount</th>
                            <th className="py-2 pr-3 font-medium">Status</th>
                            <th className="py-2 font-medium">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono tabular-nums">
                          {(ordersQuery.data || []).map((ord) => (
                            <tr key={`pay-${ord.id}`}>
                              <td className="py-2.5 pr-3 font-semibold text-zinc-900 dark:text-zinc-100">
                                {ord.orderNumber}
                              </td>
                              <td className="py-2.5 pr-3 uppercase">{ord.paymentMethod}</td>
                              <td className="py-2.5 pr-3 text-zinc-500 truncate max-w-[180px]">
                                {ord.providerRefId || ord.transactionUuid || '—'}
                              </td>
                              <td className="py-2.5 pr-3 font-semibold">
                                {formatMoney(ord.totalAmount, ord.currency)}
                              </td>
                              <td className="py-2.5 pr-3 uppercase text-blue-600 dark:text-blue-400">
                                {ord.status}
                              </td>
                              <td className="py-2.5 text-zinc-500">{ord.paidAt || ord.createdAt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {activeTab === 'emails' ? (
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold">
                  {t('tabEmails')} ({user.email})
                </h2>
                <p className="text-xs text-zinc-500">
                  Welcome, Add-to-Cart, and Order/Payment confirmation emails sent to your login email.
                </p>
              </CardHeader>
              <CardContent>
                {emailsQuery.isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (emailsQuery.data || []).length === 0 ? (
                  <p className="text-sm text-zinc-500">No notification emails recorded yet.</p>
                ) : (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {(emailsQuery.data || []).map((log) => (
                      <div key={log.id} className="py-3.5 space-y-1 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{log.subject}</p>
                          <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                            {log.eventType} · {log.deliveryStatus.toUpperCase()} · {log.createdAt}
                          </span>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-line">{log.bodyText}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {activeTab === 'security' ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-base font-semibold">{t('myProfileTitle')}</h2>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Account email: {user.email} · Role: {user.role}
                  </p>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      profileMutation.mutate();
                    }}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-end"
                  >
                    <div>
                      <label htmlFor="profile-fullname" className="text-xs font-medium block mb-1">
                        {t('fullName')}
                      </label>
                      <Input
                        id="profile-fullname"
                        required
                        minLength={2}
                        value={profileFullName}
                        onChange={(e) => setProfileFullName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Button type="submit" size="sm" disabled={profileMutation.isPending}>
                        {profileMutation.isPending ? 'Saving...' : t('saveProfileBtn')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-base font-semibold">{t('tabSecurity')}</h2>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Signed in as {user.email}. Update your account password below.
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-xs font-medium block mb-1">Current Password</label>
                      <PasswordInput
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">New Password</label>
                      <PasswordInput
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">Confirm New Password</label>
                      <PasswordInput
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                    </div>
                    <div className="md:col-span-3 flex justify-end">
                      <Button type="submit" size="sm" disabled={passwordMutation.isPending}>
                        {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
