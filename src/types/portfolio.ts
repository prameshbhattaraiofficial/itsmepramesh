export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProfileDto {
  id: number;
  fullName: string;
  headline: string;
  tagline: string;
  bio: string;
  careerObjective: string;
  email: string;
  phonePrimary: string;
  phoneSecondary: string;
  location: string;
  permanentAddress: string;
  avatarUrl: string;
  cvUrl: string;
  linkedinUrl: string;
  githubPrimaryUrl: string;
  githubSecondaryUrl: string;
  availability: string;
  languagesJson: string;
  referenceName: string;
  referenceRole: string;
  referencePhone: string;
  yearsExperienceLabel: string;
  blogEnabled: boolean;
  seoTitle: string;
  seoDescription: string;
  updatedAt: string;
}

export interface SkillItemDto {
  id: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  description: string | null;
  displayOrder: number;
}

export interface SkillCategoryDto {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
  skills: SkillItemDto[];
}

export interface ExperienceDto {
  id: number;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string | null;
  durationLabel: string;
  summary: string;
  responsibilities: string[];
  achievements: string[];
  technologies: string[];
  displayOrder: number;
}

export interface EducationDto {
  id: number;
  institution: string;
  affiliatedUniversity: string | null;
  degree: string;
  graduationYear: string;
  grade: string | null;
  highlights: string[];
  displayOrder: number;
}

export interface CertificationDto {
  id: number;
  title: string;
  issuer: string;
  issueDate: string;
  duration: string | null;
  credentialUrl: string | null;
  displayOrder: number;
}

export interface AchievementDto {
  id: number;
  title: string;
  category: string;
  metricLabel: string | null;
  organization: string;
  achievedDate: string;
  description: string;
  displayOrder: number;
}

export interface ProjectDto {
  id: number;
  title: string;
  slug: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  architectureNotes: string;
  imageUrl: string | null;
  githubUrl: string | null;
  liveDemoUrl: string | null;
  technologies: string[];
  featured: boolean;
  isPlaceholder: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceDto {
  id: number;
  title: string;
  slug: string;
  shortDescription: string;
  deliverables: string[];
  displayOrder: number;
}

export interface TestimonialDto {
  id: number;
  authorName: string;
  authorRole: string;
  organization: string;
  quote: string;
  isPlaceholder: boolean;
  displayOrder: number;
}

export interface BlogPostDto {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryName: string;
  tags: string[];
  featuredImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface ContactMessageDto {
  id: number;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  createdAt: string;
}

export interface MediaFileDto {
  id: number;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
}

export interface AuditLogDto {
  id: number;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user: {
    id: number;
    email: string;
    fullName: string;
    role: string;
  };
  welcomeEmailSent?: boolean;
  emailDeliveryStatus?: 'sent' | 'logged' | 'failed';
}

export interface AdminOverviewDto {
  projectsCount: number;
  productsCount?: number;
  ordersCount?: number;
  pendingOrdersCount?: number;
  experiencesCount: number;
  skillCategoriesCount?: number;
  skillsCount: number;
  educationCount?: number;
  certificationsCount?: number;
  achievementsCount?: number;
  servicesCount: number;
  testimonialsCount?: number;
  unreadMessagesCount: number;
  mediaCount: number;
  blogPostsCount: number;
  blogEnabled: boolean;
  recentLogs: AuditLogDto[];
}

export type CurrencyCode = 'USD' | 'NPR';
export type StorePaymentMethod = 'esewa' | 'khalti' | 'stripe' | 'bank_transfer' | 'cod';
export type StoreOrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled';

export interface ProductDto {
  id: number;
  title: string;
  slug: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  priceUsd: number;
  priceNpr: number;
  compareAtUsd: number | null;
  sku: string;
  inventoryCount: number;
  isDigital: boolean;
  imageUrl: string | null;
  hasPdf?: boolean;
  pdfUrl?: string | null;
  deliveryInfo: string;
  features: string[];
  featured: boolean;
  isActive: boolean;
  averageRating?: number;
  reviewCount?: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReviewDto {
  id: number;
  productId: number;
  userId: number;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReviewsResponseDto {
  averageRating: number;
  reviewCount: number;
  items: ProductReviewDto[];
}

export interface WishlistToggleResultDto {
  wishlisted: boolean;
  productIds: number[];
}

export interface PurchasedPdfItemDto {
  orderNumber: string;
  productId: number;
  title: string;
  sku: string;
  category: string;
  hasPdf: boolean;
  purchasedAt: string;
}

export interface OrderItemDto {
  productId: number;
  title: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  isDigital: boolean;
  hasPdf?: boolean;
}

export interface EsewaFormFieldsDto {
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
}

export interface EsewaInitiationDto {
  formUrl: string;
  mode: 'sandbox' | 'production';
  fields: EsewaFormFieldsDto;
}

export interface OrderDto {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string | null;
  paymentMethod: StorePaymentMethod;
  currency: CurrencyCode;
  totalAmount: number;
  transactionUuid?: string | null;
  providerRefId?: string | null;
  paidAt?: string | null;
  status: StoreOrderStatus;
  notes: string | null;
  items: OrderItemDto[];
  createdAt: string;
}

export interface OrderSubmissionPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress?: string;
  paymentMethod: StorePaymentMethod;
  currency: CurrencyCode;
  notes?: string;
  items: { productId: number; quantity: number }[];
}

export interface OrderReceiptDto {
  id: number;
  orderNumber: string;
  status: StoreOrderStatus;
  paymentMethod: StorePaymentMethod;
  currency: CurrencyCode;
  totalAmount: number;
  providerRefId?: string | null;
  items: OrderItemDto[];
  createdAt: string;
  esewa?: EsewaInitiationDto;
}

export interface EmailLogDto {
  id: number;
  recipientEmail: string;
  eventType: string;
  subject: string;
  bodyText: string;
  deliveryStatus: 'sent' | 'logged' | 'failed';
  provider: string;
  errorMessage: string | null;
  createdAt: string;
}

export interface CartNotifyResultDto {
  recipientEmail: string;
  productId: number;
  productTitle: string;
  quantity: number;
  sent: boolean;
  provider: 'smtp' | 'resend' | 'outbox';
  deliveryStatus: 'sent' | 'logged' | 'failed';
  logId: number;
}

export interface CustomerOverviewDto {
  ordersCount: number;
  pendingOrdersCount: number;
  completedOrdersCount: number;
  emailsCount: number;
  recentOrders: OrderDto[];
}

export interface DatabaseBackupDto {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

export interface SecurityLogDto {
  id: number;
  level: 'INFO' | 'WARN' | 'ERROR';
  eventType: string;
  ipAddress: string | null;
  userEmail: string | null;
  method: string | null;
  path: string | null;
  message: string;
  createdAt: string;
}

export interface SecurityStatusDto {
  controls: {
    roleBasedAccess: boolean;
    antiForgeryCsrf: boolean;
    privatePdfStorage: boolean;
    magicByteUploadValidation: boolean;
    idempotentPaymentProcessing: boolean;
    serverSidePriceValidation: boolean;
    rateLimitingAndLockout: boolean;
    parameterizedSql: boolean;
    httpOnlyRefreshCookies: boolean;
    automatedDailyBackups: boolean;
    httpsTransportSecurity: boolean;
  };
  backups: DatabaseBackupDto[];
  securityLogs: SecurityLogDto[];
}

export interface AnalyticsDashboardDto {
  summary: {
    totalPageViews: number;
    uniqueVisitors: number;
    visitorsLast30d: number;
    totalProductViews: number;
    totalArticleViews: number;
    totalOrders: number;
    paidOrders: number;
    totalRevenueUsd: number;
    totalRevenueNpr: number;
    newsletterCount: number;
    openChatsCount: number;
    unreadChatMessagesCount: number;
  };
  dailyTraffic: {
    day: string;
    views: number;
    visitors: number;
    ordersCount?: number;
  }[];
  monthlyRevenue: {
    month: string;
    ordersCount: number;
    revenueUsd: number;
    revenueNpr: number;
  }[];
  paymentMethodBreakdown?: {
    method: string;
    count: number;
    revenueNpr: number;
    revenueUsd: number;
  }[];
  orderStatusBreakdown?: {
    status: string;
    count: number;
  }[];
  academyEngagement?: {
    classesCount: number;
    studentsCount: number;
    videosCount: number;
    videoViewsCount: number;
    liveClassesCount: number;
    attendancePresentRate: number;
  };
  communicationSummary?: {
    totalConversations: number;
    openChatsCount: number;
    totalMessages: number;
    voiceMessagesCount: number;
    totalCalls: number;
    videoCallsCount: number;
    audioCallsCount: number;
  };
  topProducts: {
    id: number;
    title: string;
    slug: string;
    category: string;
    priceUsd: number;
    priceNpr: number;
    views: number;
  }[];
  popularArticles: {
    id: number;
    title: string;
    slug: string;
    categoryName: string;
    views: number;
    commentsCount: number;
  }[];
}

export interface BlogCommentDto {
  id: number;
  postId: number;
  authorName: string;
  comment: string;
  createdAt: string;
}

export interface AdminBlogCommentDto extends BlogCommentDto {
  postTitle: string;
  postSlug: string;
  authorEmail: string;
}

export interface NewsletterSubscriberDto {
  id: number;
  email: string;
  name: string | null;
  status: string;
  createdAt: string;
}

export interface ChatConversationDto {
  id: number;
  sessionToken: string;
  visitorName: string;
  visitorEmail: string | null;
  status: 'open' | 'closed';
  unreadAdminCount: number;
  lastMessage?: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface ChatMessageDto {
  id: number;
  conversationId: number;
  senderRole: 'visitor' | 'admin';
  senderName: string;
  message: string;
  messageType?: 'text' | 'voice' | 'call_log';
  mediaUrl?: string | null;
  mediaDurationSec?: number | null;
  createdAt: string;
}

export interface CallLogDto {
  id: number;
  conversationId: number | null;
  classSessionId: number | null;
  visitorName: string | null;
  callType: 'audio' | 'video';
  initiatedByRole: string;
  initiatedByName: string;
  status: string;
  durationSeconds: number;
  startedAt: string;
  endedAt: string | null;
}

export interface AdminNotificationDto {
  id: string;
  category: 'order' | 'payment' | 'contact' | 'chat' | 'newsletter' | 'comment' | 'system';
  title: string;
  message: string;
  conversationId?: number;
  createdAt: string;
}

// --- Student Management & Online Classroom Portal DTOs ---

export interface ClassSectionDto {
  id: number;
  classId: number;
  name: string;
  roomLabel: string;
  classTeacher: string;
  capacity: number;
  studentsCount: number;
}

export interface SchoolClassDto {
  id: number;
  name: string;
  code: string;
  description: string;
  academicYear: string;
  isActive: boolean;
  displayOrder: number;
  sections: ClassSectionDto[];
}

export interface StudentDto {
  id: number;
  studentCode: string;
  fullName: string;
  email: string;
  phone: string;
  classId: number;
  className: string;
  classCode: string;
  sectionId: number;
  sectionName: string;
  roomLabel: string;
  classTeacher: string;
  rollNumber: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  status: 'active' | 'inactive' | 'graduated';
  userId: number | null;
  enrolledAt: string;
}

export interface OnlineClassDto {
  id: number;
  title: string;
  subject: string;
  classId: number;
  className: string;
  classCode: string;
  sectionId: number | null;
  sectionName: string;
  instructorName: string;
  description: string;
  scheduledDate: string;
  startTime: string;
  durationMinutes: number;
  meetingUrl: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  autoAttendance: boolean;
  createdAt: string;
}

export interface OnlineClassMessageDto {
  id: number;
  onlineClassId: number;
  senderName: string;
  senderRole: string;
  message: string;
  messageType?: 'text' | 'voice' | 'call_log';
  mediaUrl?: string | null;
  mediaDurationSec?: number | null;
  createdAt: string;
}

export interface ClassVideoDto {
  id: number;
  title: string;
  subject: string;
  classId: number;
  className: string;
  sectionId: number | null;
  sectionName: string;
  description: string;
  sourceType: 'upload' | 'link';
  videoUrl: string;
  fileName: string | null;
  durationLabel: string;
  instructorName: string;
  notesUrl: string;
  isPublished: boolean;
  viewsCount: number;
  createdAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRegisterRowDto {
  studentId: number;
  studentCode: string;
  rollNumber: string;
  fullName: string;
  email: string;
  status: AttendanceStatus | null;
  remarks: string;
  markedBy: string | null;
  attendancePercentage: number;
  totalRecordedDays: number;
}

export interface TimetableEntryDto {
  id: number;
  classId: number;
  className: string;
  sectionId: number;
  sectionName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
  instructorName: string;
  roomOrMode: string;
}

export interface AssignmentSubmissionDto {
  id: number;
  assignmentId?: number;
  studentId?: number;
  studentName?: string;
  studentCode?: string;
  rollNumber?: string;
  submissionText: string;
  submissionUrl: string;
  marksObtained: number | null;
  feedback: string;
  status: 'submitted' | 'graded';
  submittedAt: string;
}

export interface ClassAssignmentDto {
  id: number;
  classId?: number;
  className?: string;
  sectionId?: number | null;
  sectionName?: string;
  title: string;
  subject: string;
  description: string;
  dueDate: string;
  maxMarks: number;
  submissionsCount?: number;
  submission?: AssignmentSubmissionDto | null;
}

export interface AcademyNoticeDto {
  id: number;
  classId?: number | null;
  className: string;
  sectionId?: number | null;
  sectionName: string;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  publishedBy: string;
  createdAt: string;
}

export interface StudentPortalOverviewDto {
  enrolled: boolean;
  student: StudentDto | null;
  attendanceSummary: {
    totalDays: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    excusedCount: number;
    percentage: number;
  };
  attendanceRecords: {
    id: number;
    attendanceDate: string;
    status: AttendanceStatus;
    remarks: string;
    markedBy: string;
  }[];
  onlineClasses: OnlineClassDto[];
  videos: ClassVideoDto[];
  timetable: TimetableEntryDto[];
  assignments: ClassAssignmentDto[];
  notices: AcademyNoticeDto[];
}

export interface AcademyAdminOverviewDto {
  classesCount: number;
  sectionsCount: number;
  studentsCount: number;
  liveClassesCount: number;
  scheduledClassesCount: number;
  videosCount: number;
  assignmentsCount: number;
  noticesCount: number;
  todayAttendanceMarked: number;
  todayPresentCount: number;
}

