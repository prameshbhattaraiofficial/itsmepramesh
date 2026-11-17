import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ContactSection } from '@/src/features/contact/ContactSection';
import { ThemeProvider, useTheme } from '@/src/app/providers/ThemeProvider';
import { LanguageProvider, useLanguage } from '@/src/app/providers/LanguageProvider';
import { LanguageToggle } from '@/src/components/common/LanguageToggle';
import { StarRatingInput } from '@/src/components/common/StarRating';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import type { ProfileDto } from '@/src/types/portfolio';

import { MemoryRouter } from 'react-router-dom';
import { AdminLoginPage } from '@/src/features/admin/AdminLoginPage';
import { AdminAnalyticsPanel } from '@/src/features/admin/AdminAnalyticsAndChatPanels';
import { UserLoginPage } from '@/src/features/auth/UserLoginPage';
import { ForgotPasswordPage } from '@/src/features/auth/ForgotPasswordPage';
import { AuthProvider } from '@/src/app/providers/AuthProvider';
import { CartProvider, useCart } from '@/src/features/products/CartContext';
import { adminApi } from '@/src/services/api/adminApi';
import type { ProductDto } from '@/src/types/portfolio';
import { NewsletterForm } from '@/src/components/common/NewsletterForm';
import { LiveChatWidget } from '@/src/components/common/LiveChatWidget';
import { resolveVideoEmbed } from '@/src/features/academy/AcademyMediaComponents';
import { PublicClassesPage } from '@/src/features/academy/PublicClassesPage';
import { academyApi } from '@/src/services/api/academyApi';
import { QueryProvider } from '@/src/app/providers/QueryProvider';


const mockProfile: ProfileDto = {
  id: 1,
  fullName: 'Pramesh Bhattarai',
  headline: 'Full-Stack Software Engineer',
  tagline: 'Designing resilient C# APIs.',
  bio: 'Kathmandu-based .NET Developer.',
  careerObjective: 'Experienced .NET Developer.',
  email: 'prameshbhattaraiofficial@gmail.com',
  phonePrimary: '+977 9863439135',
  phoneSecondary: '+977 9709166318',
  location: 'Kapan, Kathmandu, Nepal',
  permanentAddress: 'Sindhupalchowk, Tinghare',
  avatarUrl: '/assets/pramesh-avatar.jpg',
  cvUrl: '/assets/aistudio/Pramesh_Bhattarai__1__3a748bfe.pdf',
  linkedinUrl: 'https://www.linkedin.com/in/prameshbhattaraiofficial',
  githubPrimaryUrl: 'https://github.com/prameshbhattaraiofficial',
  githubSecondaryUrl: 'https://github.com/codingwithpramesh',
  availability: 'Full-Time · Freelance',
  languagesJson: '[]',
  referenceName: 'Smart Card Nepal Pvt. Ltd.',
  referenceRole: 'MyPay Reference',
  referencePhone: '9709166318',
  yearsExperienceLabel: '5+ Years',
  blogEnabled: false,
  seoTitle: 'Pramesh Bhattarai',
  seoDescription: 'Portfolio',
  updatedAt: '2026-11-14',
};

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      mode:{theme}
    </button>
  );
}

function LanguageProbe() {
  const { lang, t } = useLanguage();
  return (
    <div>
      <LanguageToggle />
      <span data-testid="lang-code">{lang}</span>
      <span data-testid="translated-products">{t('myProductsTitle')}</span>
    </div>
  );
}

describe('Portfolio Core Flows', () => {
  it('validates contact form fields before submitting to API', async () => {
    const spy = vi.spyOn(portfolioApi, 'submitContact').mockResolvedValue({ id: 1, message: 'Sent' });
    render(<ContactSection profile={mockProfile} />);

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/please enter your name/i)).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Pramesh Client' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'client@example.com' } });
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: 'API Consulting' } });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: 'We need help designing a .NET 10 Web API architecture.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        senderName: 'Pramesh Client',
        senderEmail: 'client@example.com',
        subject: 'API Consulting',
        message: 'We need help designing a .NET 10 Web API architecture.',
      });
    });
    spy.mockRestore();
  });

  it('defaults to dark theme and persists theme switching', () => {
    localStorage.clear();
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    const btn = screen.getByRole('button', { name: /mode:dark/i });
    fireEvent.click(btn);
    expect(screen.getByRole('button', { name: /mode:light/i })).toBeTruthy();
    expect(localStorage.getItem('pb_portfolio_theme')).toBe('light');
  });

  it('switches language between English and Nepali and persists preference', () => {
    localStorage.clear();
    render(
      <LanguageProvider>
        <LanguageProbe />
      </LanguageProvider>
    );

    expect(screen.getByTestId('lang-code').textContent).toBe('en');
    expect(screen.getByTestId('translated-products').textContent).toBe('My Products');

    fireEvent.click(screen.getByRole('button', { name: 'नेपाली' }));

    expect(screen.getByTestId('lang-code').textContent).toBe('ne');
    expect(screen.getByTestId('translated-products').textContent).toBe('मेरो उत्पादनहरू');
    expect(localStorage.getItem('pb_portfolio_lang')).toBe('ne');

    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByTestId('lang-code').textContent).toBe('en');
    expect(localStorage.getItem('pb_portfolio_lang')).toBe('en');
  });

  it('updates star rating value from 1 to 5', () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={5} onChange={onChange} />);

    const threeStar = screen.getByRole('radio', { name: '3 stars' });
    fireEvent.click(threeStar);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('toggles password visibility on admin login page', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminLoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const showButton = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(showButton);
    expect(passwordInput.type).toBe('text');

    const hideButton = screen.getByRole('button', { name: /hide password/i });
    fireEvent.click(hideButton);
    expect(passwordInput.type).toBe('password');
  });

  it('toggles password visibility on account login page', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <UserLoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput.type).toBe('text');
  });

  it('sends cart notification email to authenticated login email when adding to cart', async () => {
    localStorage.clear();
    localStorage.setItem('pb_admin_access_token', 'fake-token');
    const meSpy = vi.spyOn(adminApi, 'me').mockResolvedValue({
      id: 2,
      email: 'customer@example.com',
      fullName: 'Test Customer',
      role: 'Customer',
    });
    const notifySpy = vi.spyOn(portfolioApi, 'notifyCartAdded').mockResolvedValue({
      recipientEmail: 'customer@example.com',
      productId: 10,
      productTitle: 'Starter Kit',
      quantity: 1,
      sent: true,
      provider: 'smtp',
      deliveryStatus: 'sent',
      logId: 1,
    });

    const sampleProduct: ProductDto = {
      id: 10,
      title: 'Starter Kit',
      slug: 'starter-kit',
      category: 'Templates',
      shortDescription: 'Clean template',
      fullDescription: 'Clean template details',
      priceUsd: 29,
      priceNpr: 3900,
      compareAtUsd: null,
      sku: 'SKU-10',
      inventoryCount: 5,
      isDigital: true,
      imageUrl: null,
      hasPdf: false,
      deliveryInfo: 'Instant',
      features: [],
      featured: false,
      isActive: true,
      averageRating: 4.5,
      reviewCount: 2,
      displayOrder: 1,
      createdAt: '2026-11-15',
      updatedAt: '2026-11-15',
    };

    function CartProbe() {
      const { addItem, totalCount } = useCart();
      return (
        <button type="button" onClick={() => addItem(sampleProduct, 1, false)}>
          add:{totalCount}
        </button>
      );
    }

    render(
      <AuthProvider>
        <CartProvider>
          <CartProbe />
        </CartProvider>
      </AuthProvider>
    );

    await waitFor(() => expect(meSpy).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /add:0/i }));

    await waitFor(() => {
      expect(notifySpy).toHaveBeenCalledWith({
        productId: 10,
        quantity: 1,
        currency: 'USD',
      });
    });

    meSpy.mockRestore();
    notifySpy.mockRestore();
  });

  it('submits newsletter subscription form to API', async () => {
    const subSpy = vi.spyOn(portfolioApi, 'subscribeNewsletter').mockResolvedValue({
      alreadySubscribed: false,
      message: 'Subscribed successfully.',
    });

    render(
      <LanguageProvider>
        <NewsletterForm />
      </LanguageProvider>
    );

    const input = screen.getByLabelText(/newsletter email address/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'reader@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(subSpy).toHaveBeenCalledWith({ email: 'reader@example.com' });
    });

    subSpy.mockRestore();
  });

  it('opens live chat widget, initializes session, and sends visitor message', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const OriginalWebSocket = globalThis.WebSocket;
    class MockWebSocket {
      readyState = 1;
      onopen: (() => void) | null = null;
      onclose: (() => void) | null = null;
      onmessage: ((evt: MessageEvent) => void) | null = null;
      constructor() {
        setTimeout(() => this.onopen?.(), 0);
      }
      close() {
        this.readyState = 3;
      }
    }
    vi.stubGlobal('WebSocket', MockWebSocket);

    const initSpy = vi.spyOn(portfolioApi, 'initChatSession').mockResolvedValue({
      conversation: {
        id: 7,
        sessionToken: 'sess-test',
        visitorName: 'Visitor',
        visitorEmail: '',
        status: 'open',
        unreadAdminCount: 0,
        lastMessageAt: '2026-11-16',
        createdAt: '2026-11-16',
      },
      messages: [],
    });
    const sendSpy = vi.spyOn(portfolioApi, 'sendChatMessage').mockResolvedValue({
      id: 11,
      conversationId: 7,
      senderRole: 'visitor',
      senderName: 'Visitor',
      message: 'Hello, I need help with PDF books',
      createdAt: '2026-11-16',
    });

    try {
      render(
        <AuthProvider>
          <LanguageProvider>
            <LiveChatWidget />
          </LanguageProvider>
        </AuthProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /live support chat/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /live support chat/i })).toBeTruthy();
        expect(initSpy).toHaveBeenCalled();
      });

      const msgInput = screen.getByPlaceholderText(/write a message/i);
      fireEvent.change(msgInput, { target: { value: 'Hello, I need help with PDF books' } });
      fireEvent.click(screen.getByRole('button', { name: /send chat message/i }));

      await waitFor(() => {
        expect(sendSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Hello, I need help with PDF books',
          })
        );
        expect(screen.getByText('Hello, I need help with PDF books')).toBeTruthy();
      });
    } finally {
      initSpy.mockRestore();
      sendSpy.mockRestore();
      vi.stubGlobal('WebSocket', OriginalWebSocket);
    }
  });

  it('renders WhatsApp direct chat link in ContactSection', () => {
    render(
      <LanguageProvider>
        <ContactSection profile={mockProfile} />
      </LanguageProvider>
    );

    const waLink = screen.getByRole('link', { name: /chat on whatsapp/i }) as HTMLAnchorElement;
    expect(waLink.href).toBe('https://wa.me/9779863439135');
  });

  it('resolves video embed modes for uploaded streams, YouTube, Vimeo, and Google Drive', () => {
    expect(resolveVideoEmbed('/api/v1/academy/videos/12/stream')).toEqual({
      mode: 'html5',
      src: '/api/v1/academy/videos/12/stream',
    });
    expect(resolveVideoEmbed('https://cdn.example.com/lecture.mp4')).toEqual({
      mode: 'html5',
      src: 'https://cdn.example.com/lecture.mp4',
    });
    expect(resolveVideoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      mode: 'iframe',
      src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
    });
    expect(resolveVideoEmbed('https://youtu.be/abc123XYZ')).toEqual({
      mode: 'iframe',
      src: 'https://www.youtube-nocookie.com/embed/abc123XYZ?rel=0',
    });
    expect(resolveVideoEmbed('https://vimeo.com/76979871')).toEqual({
      mode: 'iframe',
      src: 'https://player.vimeo.com/video/76979871',
    });
    expect(resolveVideoEmbed('https://drive.google.com/file/d/1A2B3C4D5E/view?usp=sharing')).toEqual({
      mode: 'iframe',
      src: 'https://drive.google.com/file/d/1A2B3C4D5E/preview',
    });
  });

  it('renders class and section catalog with live online classes and videos on PublicClassesPage', async () => {
    const classesSpy = vi.spyOn(academyApi, 'getClasses').mockResolvedValue([
      {
        id: 1,
        name: '.NET 10 Architecture Track',
        code: 'CS-NET10',
        academicYear: '2026',
        description: 'Backend enterprise engineering.',
        isActive: true,
        displayOrder: 1,
        sections: [
          {
            id: 11,
            classId: 1,
            name: 'Section A (Morning)',
            roomLabel: 'Virtual Room A',
            classTeacher: 'Pramesh Bhattarai',
            capacity: 40,
            studentsCount: 12,
          },
        ],
      },
    ]);
    const onlineSpy = vi.spyOn(academyApi, 'getOnlineClasses').mockResolvedValue([
      {
        id: 21,
        classId: 1,
        className: '.NET 10 Architecture Track',
        classCode: 'CS-NET10',
        sectionId: 11,
        sectionName: 'Section A (Morning)',
        title: 'Clean Architecture & CQRS Live Workshop',
        subject: 'Backend Engineering',
        instructorName: 'Pramesh Bhattarai',
        scheduledDate: '2026-11-16',
        startTime: '08:00',
        durationMinutes: 60,
        meetingUrl: 'https://meet.jit.si/test-room',
        status: 'live',
        autoAttendance: true,
        description: 'Interactive coding session.',
        createdAt: '2026-11-16',
      },
    ]);
    const videosSpy = vi.spyOn(academyApi, 'getVideos').mockResolvedValue([
      {
        id: 31,
        classId: 1,
        className: '.NET 10 Architecture Track',
        sectionId: 11,
        sectionName: 'Section A (Morning)',
        title: 'DI & Middleware Pipeline Lecture',
        subject: 'ASP.NET Core',
        instructorName: 'Pramesh Bhattarai',
        sourceType: 'link',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        fileName: null,
        durationLabel: '42:10',
        notesUrl: '',
        description: 'Recorded class lecture.',
        viewsCount: 19,
        isPublished: true,
        createdAt: '2026-11-16',
      },
    ]);
    const timetableSpy = vi.spyOn(academyApi, 'getTimetable').mockResolvedValue([]);
    const noticesSpy = vi.spyOn(academyApi, 'getNotices').mockResolvedValue([]);
    const viewSpy = vi.spyOn(academyApi, 'trackVideoView').mockResolvedValue({ tracked: true });

    try {
      render(
        <MemoryRouter>
          <QueryProvider>
            <AuthProvider>
              <LanguageProvider>
                <PublicClassesPage />
              </LanguageProvider>
            </AuthProvider>
          </QueryProvider>
        </MemoryRouter>
      );

      expect(await screen.findByText('Clean Architecture & CQRS Live Workshop')).toBeTruthy();
      expect(screen.getByText('DI & Middleware Pipeline Lecture')).toBeTruthy();
      expect(screen.getByText('LIVE NOW')).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: /watch video/i }));
      expect(await screen.findByRole('dialog', { name: 'DI & Middleware Pipeline Lecture' })).toBeTruthy();
      expect(viewSpy).toHaveBeenCalledWith(31);
    } finally {
      classesSpy.mockRestore();
      onlineSpy.mockRestore();
      videosSpy.mockRestore();
      timetableSpy.mockRestore();
      noticesSpy.mockRestore();
      viewSpy.mockRestore();
    }
  });

  it('completes forgot password OTP request and reset password flow with password visibility toggle', async () => {
    const forgotSpy = vi.spyOn(adminApi, 'forgotPassword').mockResolvedValue({
      requested: true,
      email: 'student@example.com',
      deliveryStatus: 'sent',
    });
    const resetSpy = vi.spyOn(adminApi, 'resetPassword').mockResolvedValue({
      reset: true,
    });

    try {
      render(
        <MemoryRouter>
          <LanguageProvider>
            <ForgotPasswordPage />
          </LanguageProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'student@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /send 6-digit reset code/i }));

      await waitFor(() => {
        expect(forgotSpy).toHaveBeenCalledWith('student@example.com');
      });

      const codeInput = await screen.findByLabelText(/6-digit verification code/i);
      const newPwdInput = screen.getByLabelText(/^new password$/i) as HTMLInputElement;
      const confirmPwdInput = screen.getByLabelText(/^confirm new password$/i) as HTMLInputElement;

      expect(newPwdInput.type).toBe('password');
      fireEvent.click(screen.getAllByRole('button', { name: /show password/i })[0]);
      expect(newPwdInput.type).toBe('text');

      fireEvent.change(codeInput, { target: { value: '482910' } });
      fireEvent.change(newPwdInput, { target: { value: 'StrongPass123' } });
      fireEvent.change(confirmPwdInput, { target: { value: 'StrongPass123' } });

      fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(resetSpy).toHaveBeenCalledWith({
          email: 'student@example.com',
          codeOrToken: '482910',
          newPassword: 'StrongPass123',
        });
      });

      expect(await screen.findByText(/password updated/i)).toBeTruthy();
    } finally {
      forgotSpy.mockRestore();
      resetSpy.mockRestore();
    }
  });

  it('renders AdminAnalyticsPanel interactive SVG charts, range toggles, donut distributions, and comm stats', async () => {
    const analyticsSpy = vi.spyOn(adminApi, 'getAnalytics').mockResolvedValue({
      summary: {
        totalPageViews: 1420,
        uniqueVisitors: 312,
        visitorsLast30d: 280,
        totalProductViews: 510,
        totalArticleViews: 290,
        totalOrders: 18,
        paidOrders: 14,
        totalRevenueUsd: 240,
        totalRevenueNpr: 45000,
        newsletterCount: 64,
        openChatsCount: 3,
        unreadChatMessagesCount: 5,
      },
      dailyTraffic: Array.from({ length: 30 }, (_, i) => ({
        day: `2026-10-${String(i + 1).padStart(2, '0')}`,
        views: 20 + i,
        visitors: 8 + Math.floor(i / 2),
        ordersCount: i % 3,
      })),
      monthlyRevenue: [
        { month: '2026-11', ordersCount: 14, revenueUsd: 240, revenueNpr: 45000 },
      ],
      paymentMethodBreakdown: [
        { method: 'esewa', count: 10, revenueNpr: 35000, revenueUsd: 0 },
        { method: 'khalti', count: 4, revenueNpr: 10000, revenueUsd: 0 },
      ],
      orderStatusBreakdown: [
        { status: 'paid', count: 14 },
        { status: 'pending', count: 4 },
      ],
      academyEngagement: {
        classesCount: 4,
        studentsCount: 42,
        videosCount: 15,
        videoViewsCount: 310,
        liveClassesCount: 2,
        attendancePresentRate: 92,
      },
      communicationSummary: {
        totalConversations: 12,
        openChatsCount: 3,
        totalMessages: 86,
        voiceMessagesCount: 9,
        totalCalls: 6,
        videoCallsCount: 4,
        audioCallsCount: 2,
      },
      topProducts: [],
      popularArticles: [],
    });

    try {
      render(
        <QueryProvider>
          <AdminAnalyticsPanel />
        </QueryProvider>
      );

      expect(await screen.findByRole('img', { name: /visitor traffic chart for last 14 days/i })).toBeTruthy();
      expect(screen.getByRole('img', { name: /payment method distribution/i })).toBeTruthy();
      expect(screen.getByRole('img', { name: /order fulfillment status split/i })).toBeTruthy();
      expect(screen.getByText('92%')).toBeTruthy();
      expect(screen.getByText('Voice Recordings')).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: '30D' }));
      expect(screen.getByRole('img', { name: /visitor traffic chart for last 30 days/i })).toBeTruthy();
    } finally {
      analyticsSpy.mockRestore();
    }
  });

  it('renders audio call, video call, voice recorder button, and voice note audio player in LiveChatWidget', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const OriginalWebSocket = globalThis.WebSocket;
    class MockWebSocket {
      readyState = 1;
      onopen: (() => void) | null = null;
      onclose: (() => void) | null = null;
      onmessage: ((evt: MessageEvent) => void) | null = null;
      send = vi.fn();
      constructor() {
        setTimeout(() => this.onopen?.(), 0);
      }
      close() {
        this.readyState = 3;
      }
    }
    vi.stubGlobal('WebSocket', MockWebSocket);

    const initSpy = vi.spyOn(portfolioApi, 'initChatSession').mockResolvedValue({
      conversation: {
        id: 8,
        sessionToken: 'sess-voice-test',
        visitorName: 'Visitor',
        visitorEmail: '',
        status: 'open',
        unreadAdminCount: 0,
        lastMessageAt: '2026-11-16',
        createdAt: '2026-11-16',
      },
      messages: [
        {
          id: 91,
          conversationId: 8,
          senderRole: 'admin',
          senderName: 'Pramesh Bhattarai',
          message: 'Voice message (0:05)',
          messageType: 'voice',
          mediaUrl: '/api/v1/chat/voice/test-note.webm',
          mediaDurationSec: 5,
          createdAt: '2026-11-16',
        },
      ],
    });

    try {
      render(
        <AuthProvider>
          <LanguageProvider>
            <LiveChatWidget />
          </LanguageProvider>
        </AuthProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /live support chat/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start audio call/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /start video call/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /record voice message/i })).toBeTruthy();
        expect(screen.getByText('Voice Recording')).toBeTruthy();
      });
    } finally {
      initSpy.mockRestore();
      vi.stubGlobal('WebSocket', OriginalWebSocket);
    }
  });
});

