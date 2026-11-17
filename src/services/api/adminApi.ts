import { httpClient } from './httpClient';
import type {
  AdminBlogCommentDto,
  AdminOverviewDto,
  AnalyticsDashboardDto,
  ApiResponse,
  AuditLogDto,
  AuthTokensDto,
  BlogPostDto,
  CallLogDto,
  ChatConversationDto,
  ChatMessageDto,
  ContactMessageDto,
  DatabaseBackupDto,
  EmailLogDto,
  MediaFileDto,
  NewsletterSubscriberDto,
  OrderDto,
  ProductDto,
  SecurityStatusDto,
  StoreOrderStatus,
} from '@/src/types/portfolio';

export const adminApi = {
  login: async (email: string, password: string): Promise<AuthTokensDto> => {
    const res = await httpClient.post<ApiResponse<AuthTokensDto>>('/auth/login', { email, password });
    return res.data.data;
  },

  register: async (payload: { fullName: string; email: string; password: string }): Promise<AuthTokensDto> => {
    const res = await httpClient.post<ApiResponse<AuthTokensDto>>('/auth/register', payload);
    return res.data.data;
  },

  logout: async (refreshToken: string | null): Promise<void> => {
    await httpClient.post('/auth/logout', { refreshToken });
  },

  me: async (): Promise<AuthTokensDto['user']> => {
    const res = await httpClient.get<ApiResponse<AuthTokensDto['user']>>('/auth/me');
    return res.data.data;
  },

  changePassword: async (payload: { currentPassword: string; newPassword: string }): Promise<void> => {
    await httpClient.post('/auth/change-password', payload);
  },

  forgotPassword: async (email: string): Promise<{ requested: boolean; email: string; deliveryStatus: string }> => {
    const res = await httpClient.post<ApiResponse<{ requested: boolean; email: string; deliveryStatus: string }>>(
      '/auth/forgot-password',
      { email }
    );
    return res.data.data;
  },

  resetPassword: async (payload: { email: string; codeOrToken: string; newPassword: string }): Promise<{ reset: boolean }> => {
    const res = await httpClient.post<ApiResponse<{ reset: boolean }>>('/auth/reset-password', payload);
    return res.data.data;
  },

  updateUserProfile: async (payload: { fullName: string }): Promise<AuthTokensDto['user']> => {
    const res = await httpClient.patch<ApiResponse<AuthTokensDto['user']>>('/auth/profile', payload);
    return res.data.data;
  },

  getOverview: async (): Promise<AdminOverviewDto> => {
    const res = await httpClient.get<ApiResponse<AdminOverviewDto>>('/admin/overview');
    return res.data.data;
  },

  updateProfile: async (payload: Record<string, unknown>): Promise<void> => {
    await httpClient.put('/admin/profile', payload);
  },

  createProject: async (payload: Record<string, unknown>): Promise<void> => {
    await httpClient.post('/admin/projects', payload);
  },

  updateProject: async (id: number, payload: Record<string, unknown>): Promise<void> => {
    await httpClient.put(`/admin/projects/${id}`, payload);
  },

  deleteProject: async (id: number): Promise<void> => {
    await httpClient.delete(`/admin/projects/${id}`);
  },

  createExperience: async (payload: Record<string, unknown>): Promise<void> => {
    await httpClient.post('/admin/experiences', payload);
  },

  updateExperience: async (id: number, payload: Record<string, unknown>): Promise<void> => {
    await httpClient.put(`/admin/experiences/${id}`, payload);
  },

  deleteExperience: async (id: number): Promise<void> => {
    await httpClient.delete(`/admin/experiences/${id}`);
  },

  createEducation: async (payload: Record<string, unknown>): Promise<void> => {
    await httpClient.post('/admin/education', payload);
  },

  updateEducation: async (id: number, payload: Record<string, unknown>): Promise<void> => {
    await httpClient.put(`/admin/education/${id}`, payload);
  },

  deleteEducation: async (id: number): Promise<void> => {
    await httpClient.delete(`/admin/education/${id}`);
  },

  createCertification: async (payload: Record<string, unknown>): Promise<void> => {
    await httpClient.post('/admin/certifications', payload);
  },

  updateCertification: async (id: number, payload: Record<string, unknown>): Promise<void> => {
    await httpClient.put(`/admin/certifications/${id}`, payload);
  },

  deleteCertification: async (id: number): Promise<void> => {
    await httpClient.delete(`/admin/certifications/${id}`);
  },

  createAchievement: async (payload: Record<string, unknown>): Promise<void> => {
    await httpClient.post('/admin/achievements', payload);
  },

  updateAchievement: async (id: number, payload: Record<string, unknown>): Promise<void> => {
    await httpClient.put(`/admin/achievements/${id}`, payload);
  },

  deleteAchievement: async (id: number): Promise<void> => {
    await httpClient.delete(`/admin/achievements/${id}`);
  },

  createSkillCategory: async (payload: { name: string; displayOrder?: number }): Promise<void> => {
    await httpClient.post('/admin/skill-categories', payload);
  },

  updateSkillCategory: async (id: number, payload: { name: string; displayOrder?: number }): Promise<void> => {
    await httpClient.put(`/admin/skill-categories/${id}`, payload);
  },

  deleteSkillCategory: async (id: number): Promise<void> => {
    await httpClient.delete(`/admin/skill-categories/${id}`);
  },

  createSkill: async (payload: { categoryId: number; name: string; description?: string | null; displayOrder?: number }) => {
    await httpClient.post('/admin/skills', payload);
  },

  updateSkill: async (
    id: number,
    payload: { categoryId: number; name: string; description?: string | null; displayOrder?: number }
  ) => {
    await httpClient.put(`/admin/skills/${id}`, payload);
  },

  deleteSkill: async (id: number) => {
    await httpClient.delete(`/admin/skills/${id}`);
  },

  createService: async (payload: Record<string, unknown>): Promise<void> => {
    await httpClient.post('/admin/services', payload);
  },

  updateService: async (id: number, payload: Record<string, unknown>): Promise<void> => {
    await httpClient.put(`/admin/services/${id}`, payload);
  },

  deleteService: async (id: number): Promise<void> => {
    await httpClient.delete(`/admin/services/${id}`);
  },

  createTestimonial: async (payload: Record<string, unknown>): Promise<void> => {
    await httpClient.post('/admin/testimonials', payload);
  },

  updateTestimonial: async (id: number, payload: Record<string, unknown>): Promise<void> => {
    await httpClient.put(`/admin/testimonials/${id}`, payload);
  },

  deleteTestimonial: async (id: number): Promise<void> => {
    await httpClient.delete(`/admin/testimonials/${id}`);
  },

  getBlogPosts: async (): Promise<BlogPostDto[]> => {
    const res = await httpClient.get<ApiResponse<BlogPostDto[]>>('/admin/blog');
    return res.data.data;
  },

  createBlogPost: async (payload: Record<string, unknown>): Promise<void> => {
    await httpClient.post('/admin/blog', payload);
  },

  updateBlogPost: async (id: number, payload: Record<string, unknown>): Promise<void> => {
    await httpClient.put(`/admin/blog/${id}`, payload);
  },

  deleteBlogPost: async (id: number): Promise<void> => {
    await httpClient.delete(`/admin/blog/${id}`);
  },

  getMessages: async (): Promise<ContactMessageDto[]> => {
    const res = await httpClient.get<ApiResponse<ContactMessageDto[]>>('/admin/messages');
    return res.data.data;
  },

  updateMessageStatus: async (id: number, status: 'unread' | 'read' | 'archived'): Promise<void> => {
    await httpClient.patch(`/admin/messages/${id}`, { status });
  },

  deleteMessage: async (id: number): Promise<void> => {
    await httpClient.delete(`/admin/messages/${id}`);
  },

  getMedia: async (): Promise<MediaFileDto[]> => {
    const res = await httpClient.get<ApiResponse<MediaFileDto[]>>('/admin/media');
    return res.data.data;
  },

  uploadMedia: async (file: File): Promise<MediaFileDto> => {
    const form = new FormData();
    form.append('file', file);
    const res = await httpClient.post<ApiResponse<MediaFileDto>>('/admin/media', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  deleteMedia: async (id: number): Promise<void> => {
    await httpClient.delete(`/admin/media/${id}`);
  },

  getAuditLogs: async (): Promise<AuditLogDto[]> => {
    const res = await httpClient.get<ApiResponse<AuditLogDto[]>>('/admin/audit-logs');
    return res.data.data;
  },

  getProducts: async (): Promise<ProductDto[]> => {
    const res = await httpClient.get<ApiResponse<ProductDto[]>>('/admin/products');
    return res.data.data;
  },

  createProduct: async (payload: Record<string, unknown>): Promise<void> => {
    await httpClient.post('/admin/products', payload);
  },

  updateProduct: async (id: number, payload: Record<string, unknown>): Promise<void> => {
    await httpClient.put(`/admin/products/${id}`, payload);
  },

  deleteProduct: async (id: number): Promise<void> => {
    await httpClient.delete(`/admin/products/${id}`);
  },

  deleteProductReview: async (id: number): Promise<void> => {
    await httpClient.delete(`/admin/reviews/${id}`);
  },

  getOrders: async (): Promise<OrderDto[]> => {
    const res = await httpClient.get<ApiResponse<OrderDto[]>>('/admin/orders');
    return res.data.data;
  },

  updateOrderStatus: async (id: number, status: StoreOrderStatus): Promise<void> => {
    await httpClient.patch(`/admin/orders/${id}`, { status });
  },

  deleteOrder: async (id: number): Promise<void> => {
    await httpClient.delete(`/admin/orders/${id}`);
  },

  uploadProductPdf: async (file: File): Promise<{ fileName: string; originalName: string; sizeBytes: number; pdfUrl: string }> => {
    const form = new FormData();
    form.append('file', file);
    const res = await httpClient.post<
      ApiResponse<{ fileName: string; originalName: string; sizeBytes: number; pdfUrl: string }>
    >('/admin/products/upload-pdf', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  getSecurityStatus: async (): Promise<SecurityStatusDto> => {
    const res = await httpClient.get<ApiResponse<SecurityStatusDto>>('/admin/security/status');
    return res.data.data;
  },

  triggerBackup: async (): Promise<{ backup: DatabaseBackupDto; backups: DatabaseBackupDto[] }> => {
    const res = await httpClient.post<ApiResponse<{ backup: DatabaseBackupDto; backups: DatabaseBackupDto[] }>>(
      '/admin/security/backup'
    );
    return res.data.data;
  },

  downloadBackup: async (fileName: string): Promise<void> => {
    const res = await httpClient.get<Blob>(`/admin/security/backups/${encodeURIComponent(fileName)}`, {
      responseType: 'blob',
    });
    const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  getEmailLogs: async (): Promise<EmailLogDto[]> => {
    const res = await httpClient.get<ApiResponse<EmailLogDto[]>>('/admin/email-logs');
    return res.data.data;
  },

  getAnalytics: async (): Promise<AnalyticsDashboardDto> => {
    const res = await httpClient.get<ApiResponse<AnalyticsDashboardDto>>('/admin/analytics');
    return res.data.data;
  },

  getChatConversations: async (): Promise<ChatConversationDto[]> => {
    const res = await httpClient.get<ApiResponse<ChatConversationDto[]>>('/admin/chat/conversations');
    return res.data.data;
  },

  getChatMessages: async (
    conversationId: number
  ): Promise<{ conversation: ChatConversationDto; messages: ChatMessageDto[] }> => {
    const res = await httpClient.get<
      ApiResponse<{ conversation: ChatConversationDto; messages: ChatMessageDto[] }>
    >(`/admin/chat/conversations/${conversationId}/messages`);
    return res.data.data;
  },

  replyChatConversation: async (conversationId: number, message: string): Promise<ChatMessageDto> => {
    const res = await httpClient.post<ApiResponse<ChatMessageDto>>(
      `/admin/chat/conversations/${conversationId}/reply`,
      { message }
    );
    return res.data.data;
  },

  uploadChatVoice: async (conversationId: number, file: File, durationSec: number): Promise<ChatMessageDto> => {
    const form = new FormData();
    form.append('audio', file);
    form.append('durationSec', String(durationSec));
    const res = await httpClient.post<ApiResponse<ChatMessageDto>>(
      `/admin/chat/conversations/${conversationId}/voice`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data.data;
  },

  getChatCalls: async (): Promise<CallLogDto[]> => {
    const res = await httpClient.get<ApiResponse<CallLogDto[]>>('/admin/chat/calls');
    return res.data.data;
  },

  updateChatStatus: async (conversationId: number, status: 'open' | 'closed'): Promise<void> => {
    await httpClient.patch(`/admin/chat/conversations/${conversationId}`, { status });
  },

  getNewsletterSubscribers: async (): Promise<NewsletterSubscriberDto[]> => {
    const res = await httpClient.get<ApiResponse<NewsletterSubscriberDto[]>>('/admin/newsletter');
    return res.data.data;
  },

  deleteNewsletterSubscriber: async (id: number): Promise<void> => {
    await httpClient.delete(`/admin/newsletter/${id}`);
  },

  getAdminBlogComments: async (): Promise<AdminBlogCommentDto[]> => {
    const res = await httpClient.get<ApiResponse<AdminBlogCommentDto[]>>('/admin/blog/comments');
    return res.data.data;
  },

  deleteAdminBlogComment: async (id: number): Promise<void> => {
    await httpClient.delete(`/admin/blog/comments/${id}`);
  },
};
