import { httpClient } from './httpClient';
import type {
  AchievementDto,
  ApiResponse,
  BlogCommentDto,
  BlogPostDto,
  CartNotifyResultDto,
  CertificationDto,
  ChatConversationDto,
  ChatMessageDto,
  CurrencyCode,
  CustomerOverviewDto,
  EducationDto,
  EmailLogDto,
  EsewaInitiationDto,
  ExperienceDto,
  OrderDto,
  OrderReceiptDto,
  OrderSubmissionPayload,
  PaginatedData,
  ProductDto,
  ProductReviewsResponseDto,
  ProfileDto,
  ProjectDto,
  PurchasedPdfItemDto,
  ServiceDto,
  SkillCategoryDto,
  TestimonialDto,
  WishlistToggleResultDto,
} from '@/src/types/portfolio';

export interface ProjectsQueryParams {
  category?: string;
  tech?: string;
  search?: string;
  sort?: 'order' | 'newest';
  page?: number;
  pageSize?: number;
}

export const portfolioApi = {
  getProfile: async (): Promise<ProfileDto> => {
    const res = await httpClient.get<ApiResponse<ProfileDto>>('/profile');
    return res.data.data;
  },

  getSkills: async (): Promise<SkillCategoryDto[]> => {
    const res = await httpClient.get<ApiResponse<SkillCategoryDto[]>>('/skills');
    return res.data.data;
  },

  getExperiences: async (): Promise<ExperienceDto[]> => {
    const res = await httpClient.get<ApiResponse<ExperienceDto[]>>('/experiences');
    return res.data.data;
  },

  getEducation: async (): Promise<{ education: EducationDto[]; certifications: CertificationDto[] }> => {
    const res = await httpClient.get<ApiResponse<{ education: EducationDto[]; certifications: CertificationDto[] }>>(
      '/education'
    );
    return res.data.data;
  },

  getAchievements: async (): Promise<{ achievements: AchievementDto[]; certifications: CertificationDto[] }> => {
    const res = await httpClient.get<ApiResponse<{ achievements: AchievementDto[]; certifications: CertificationDto[] }>>(
      '/achievements'
    );
    return res.data.data;
  },

  getProjects: async (params?: ProjectsQueryParams): Promise<PaginatedData<ProjectDto>> => {
    const res = await httpClient.get<ApiResponse<PaginatedData<ProjectDto>>>('/projects', { params });
    return res.data.data;
  },

  getProjectBySlug: async (slug: string): Promise<ProjectDto> => {
    const res = await httpClient.get<ApiResponse<ProjectDto>>(`/projects/${encodeURIComponent(slug)}`);
    return res.data.data;
  },

  getServices: async (): Promise<ServiceDto[]> => {
    const res = await httpClient.get<ApiResponse<ServiceDto[]>>('/services');
    return res.data.data;
  },

  getTestimonials: async (): Promise<TestimonialDto[]> => {
    const res = await httpClient.get<ApiResponse<TestimonialDto[]>>('/testimonials');
    return res.data.data;
  },

  getBlogPosts: async (params?: { category?: string; search?: string }): Promise<
    PaginatedData<BlogPostDto> & { enabled?: boolean }
  > => {
    const res = await httpClient.get<ApiResponse<PaginatedData<BlogPostDto> & { enabled?: boolean }>>('/blog', {
      params,
    });
    return res.data.data;
  },

  getBlogBySlug: async (slug: string): Promise<BlogPostDto> => {
    const res = await httpClient.get<ApiResponse<BlogPostDto>>(`/blog/${encodeURIComponent(slug)}`);
    return res.data.data;
  },

  submitContact: async (payload: {
    senderName: string;
    senderEmail: string;
    subject: string;
    message: string;
  }): Promise<{ id: number; message: string }> => {
    const res = await httpClient.post<ApiResponse<{ id: number }>>('/contact', payload);
    return { id: res.data.data.id, message: res.data.message || 'Message received.' };
  },

  getProducts: async (params?: { category?: string; search?: string }): Promise<ProductDto[]> => {
    const res = await httpClient.get<ApiResponse<ProductDto[]>>('/products', { params });
    return res.data.data;
  },

  getProductBySlug: async (slug: string): Promise<ProductDto> => {
    const res = await httpClient.get<ApiResponse<ProductDto>>(`/products/${encodeURIComponent(slug)}`);
    return res.data.data;
  },

  getProductReviews: async (idOrSlug: string | number): Promise<ProductReviewsResponseDto> => {
    const res = await httpClient.get<ApiResponse<ProductReviewsResponseDto>>(
      `/products/${encodeURIComponent(String(idOrSlug))}/reviews`
    );
    return res.data.data;
  },

  submitProductReview: async (
    idOrSlug: string | number,
    payload: { rating: number; comment: string }
  ): Promise<ProductReviewsResponseDto> => {
    const res = await httpClient.post<ApiResponse<ProductReviewsResponseDto>>(
      `/products/${encodeURIComponent(String(idOrSlug))}/reviews`,
      payload
    );
    return res.data.data;
  },

  deleteProductReview: async (idOrSlug: string | number, reviewId: number): Promise<ProductReviewsResponseDto> => {
    const res = await httpClient.delete<ApiResponse<ProductReviewsResponseDto>>(
      `/products/${encodeURIComponent(String(idOrSlug))}/reviews/${reviewId}`
    );
    return res.data.data;
  },

  submitOrder: async (payload: OrderSubmissionPayload, idempotencyKey?: string): Promise<OrderReceiptDto> => {
    const key =
      idempotencyKey ||
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `ord-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    const res = await httpClient.post<ApiResponse<OrderReceiptDto>>('/orders', payload, {
      headers: { 'Idempotency-Key': key },
    });
    return res.data.data;
  },

  initiateEsewaPayment: async (orderNumber: string): Promise<{
    orderNumber: string;
    totalAmount: number;
    currency: 'NPR';
    esewa: EsewaInitiationDto;
  }> => {
    const res = await httpClient.post<
      ApiResponse<{
        orderNumber: string;
        totalAmount: number;
        currency: 'NPR';
        esewa: EsewaInitiationDto;
      }>
    >('/payments/esewa/initiate', { orderNumber });
    return res.data.data;
  },

  verifyEsewaPayment: async (data: string): Promise<OrderReceiptDto> => {
    const res = await httpClient.post<ApiResponse<OrderReceiptDto>>('/payments/esewa/verify', { data });
    return res.data.data;
  },

  getOrderReceipt: async (orderNumber: string): Promise<OrderReceiptDto> => {
    const res = await httpClient.get<ApiResponse<OrderReceiptDto>>(
      `/orders/${encodeURIComponent(orderNumber)}/receipt`
    );
    return res.data.data;
  },

  notifyCartAdded: async (payload: {
    productId: number;
    quantity: number;
    currency: CurrencyCode;
  }): Promise<CartNotifyResultDto> => {
    const res = await httpClient.post<ApiResponse<CartNotifyResultDto>>('/cart/notify', payload);
    return res.data.data;
  },

  getMyOverview: async (): Promise<CustomerOverviewDto> => {
    const res = await httpClient.get<ApiResponse<CustomerOverviewDto>>('/my/overview');
    return res.data.data;
  },

  getMyOrders: async (): Promise<OrderDto[]> => {
    const res = await httpClient.get<ApiResponse<OrderDto[]>>('/my/orders');
    return res.data.data;
  },

  getMyEmails: async (): Promise<EmailLogDto[]> => {
    const res = await httpClient.get<ApiResponse<EmailLogDto[]>>('/my/emails');
    return res.data.data;
  },

  getMyWishlist: async (): Promise<ProductDto[]> => {
    const res = await httpClient.get<ApiResponse<ProductDto[]>>('/my/wishlist');
    return res.data.data;
  },

  toggleWishlist: async (productId: number): Promise<WishlistToggleResultDto> => {
    const res = await httpClient.post<ApiResponse<WishlistToggleResultDto>>('/my/wishlist/toggle', { productId });
    return res.data.data;
  },

  getMyLibrary: async (): Promise<PurchasedPdfItemDto[]> => {
    const res = await httpClient.get<ApiResponse<PurchasedPdfItemDto[]>>('/my/library');
    return res.data.data;
  },

  downloadPurchasedPdf: async (orderNumber: string, productId: number, title?: string): Promise<void> => {
    const res = await httpClient.get<Blob>(
      `/my/downloads/${encodeURIComponent(orderNumber)}/${productId}`,
      { responseType: 'blob' }
    );
    const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const safeName =
      (title || `book-${productId}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'ebook';
    anchor.download = `${safeName}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  trackAnalyticsEvent: async (payload: {
    eventType: 'page_view' | 'product_view' | 'article_view';
    path: string;
    entityId?: number | null;
    visitorId: string;
    referrer?: string | null;
  }): Promise<void> => {
    await httpClient.post('/analytics/track', payload);
  },

  getBlogComments: async (slug: string): Promise<BlogCommentDto[]> => {
    const res = await httpClient.get<ApiResponse<BlogCommentDto[]>>(
      `/blog/${encodeURIComponent(slug)}/comments`
    );
    return res.data.data;
  },

  postBlogComment: async (
    slug: string,
    payload: { authorName: string; authorEmail: string; comment: string }
  ): Promise<BlogCommentDto> => {
    const res = await httpClient.post<ApiResponse<BlogCommentDto>>(
      `/blog/${encodeURIComponent(slug)}/comments`,
      payload
    );
    return res.data.data;
  },

  subscribeNewsletter: async (payload: {
    email: string;
    name?: string;
  }): Promise<{ message: string; alreadySubscribed?: boolean }> => {
    const res = await httpClient.post<
      ApiResponse<{ id: number; email: string; alreadySubscribed?: boolean }>
    >('/newsletter/subscribe', payload);
    return {
      message: res.data.message || 'Subscribed successfully.',
      alreadySubscribed: res.data.data.alreadySubscribed,
    };
  },

  initChatSession: async (payload: {
    sessionToken: string;
    visitorName?: string;
    visitorEmail?: string;
  }): Promise<{ conversation: ChatConversationDto; messages: ChatMessageDto[] }> => {
    const res = await httpClient.post<
      ApiResponse<{ conversation: ChatConversationDto; messages: ChatMessageDto[] }>
    >('/chat/session', payload);
    return res.data.data;
  },

  sendChatMessage: async (payload: {
    sessionToken: string;
    visitorName?: string;
    visitorEmail?: string;
    message: string;
  }): Promise<ChatMessageDto> => {
    const res = await httpClient.post<ApiResponse<ChatMessageDto>>('/chat/messages', payload);
    return res.data.data;
  },

  uploadChatVoice: async (payload: {
    sessionToken: string;
    visitorName?: string;
    visitorEmail?: string;
    file: File;
    durationSec: number;
  }): Promise<ChatMessageDto> => {
    const form = new FormData();
    form.append('audio', payload.file);
    form.append('sessionToken', payload.sessionToken);
    if (payload.visitorName) form.append('visitorName', payload.visitorName);
    if (payload.visitorEmail) form.append('visitorEmail', payload.visitorEmail);
    form.append('durationSec', String(payload.durationSec));
    const res = await httpClient.post<ApiResponse<ChatMessageDto>>('/chat/voice', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },
};

