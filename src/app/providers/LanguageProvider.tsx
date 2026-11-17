import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type LanguageCode = 'en' | 'ne';

const STORAGE_KEY = 'pb_portfolio_lang';

const TRANSLATIONS = {
  en: {
    // Navbar & General
    navAbout: 'About',
    navExperience: 'Experience',
    navEducation: 'Education',
    navCertifications: 'Certifications',
    navProjects: 'Projects',
    navServices: 'Services',
    navArticles: 'Articles',
    navProducts: 'Products',
    navClasses: 'Classes',
    navAchievements: 'Achievements',
    navTestimonials: 'Testimonials',
    navSignIn: 'Sign In',
    navSignInRegister: 'Sign In / Register',
    navDashboard: 'Dashboard',
    navMyDashboard: 'My Dashboard',
    navAdmin: 'Admin',
    navAdminDashboard: 'Admin Dashboard',
    navGetInTouch: 'Get in Touch',
    navSignOut: 'Sign Out',
    languageLabel: 'EN',
    switchLanguage: 'नेपाली भाषामा हेर्नुहोस्',

    // Hero & Home Sections
    contactMe: 'Contact Me',
    downloadCv: 'Download CV',
    aboutMeTitle: 'About Me',
    skillsTitle: 'Technical Skills',
    experienceTitle: 'Work Experience',
    educationTitle: 'Education',
    achievementsTitle: 'Achievements & Certifications',
    projectsTitle: 'Projects & Case Studies',
    servicesTitle: 'Services & Capabilities',
    testimonialsTitle: 'Testimonials & Endorsements',
    contactTitle: 'Get in Touch',
    sendMessage: 'Send Message',
    portalLogin: 'Portal Login',
    allRightsReserved: 'All rights reserved.',

    // Products Storefront
    myProductsTitle: 'My Products',
    cart: 'Cart',
    allCategory: 'All',
    wishlistFilter: 'Wishlist',
    pdfBooksBadge: 'PDF Book',
    searchProductsPlaceholder: 'Search products, PDF books, or SKU...',
    inStock: 'In Stock',
    soldOut: 'Sold Out',
    digitalDelivery: 'Digital Delivery',
    pdfDownloadIncluded: 'Instant PDF Download',
    details: 'Details',
    addToCart: 'Add to Cart',
    buyNow: 'Buy Now',
    unavailable: 'Unavailable',
    noProductsMatch: 'No products match the selected filter.',
    resetFilters: 'Reset Filters',
    backToProducts: 'Back to Products',
    addToWishlist: 'Save to wishlist',
    removeFromWishlist: 'Remove from wishlist',
    overview: 'Overview',
    whatIsIncluded: 'What Is Included',
    quantity: 'Quantity',
    reviewsTitle: 'Customer Ratings & Reviews',
    writeReview: 'Write a Review',
    updateReview: 'Update Your Review',
    yourRating: 'Your Rating',
    yourReview: 'Your Review',
    reviewPlaceholder: 'Share your thoughts about this product or PDF book...',
    submitReview: 'Submit Review',
    submittingReview: 'Saving...',
    signInToReview: 'Sign in to rate and write a review for this product.',
    noReviewsYet: 'No reviews yet. Be the first to rate and review this product.',
    reviewsCountLabel: 'reviews',
    deleteReview: 'Delete',

    // Cart Drawer
    shoppingCart: 'Shopping Cart',
    checkoutDetails: 'Checkout Details',
    continueToEsewa: 'Continue to eSewa',
    orderConfirmed: 'Order Confirmed',
    proceedToCheckout: 'Proceed to Checkout',
    backToCart: 'Back to Cart',
    payWithEsewa: 'Pay with eSewa',
    placeOrder: 'Place Order',
    continueBrowsing: 'Continue Browsing Products',
    cartEmptyTitle: 'Your cart is empty',
    cartEmptyDesc: 'Browse software starter kits, PDF books, templates, and engineering packages to add items.',
    browseProductsBtn: 'Browse Products',

    // Login / Auth
    backToPortfolio: 'Back to Portfolio',
    portalSignIn: 'Portal Sign In',
    portalSignInSubtitle:
      'Sign in to access your dashboard, buy & download PDF books, manage cart & payments, review products, or administrate the site.',
    signInTab: 'Sign In',
    createAccountTab: 'Create Account',
    fullName: 'Full Name',
    emailAddress: 'Email Address',
    password: 'Password',

    // Customer Portal / User Dashboard
    customerPortal: 'Customer Portal',
    tabOverview: 'Dashboard Overview',
    tabShop: 'Browse Products',
    tabWishlist: 'My Wishlist',
    tabLibrary: 'PDF Books Library',
    tabCart: 'My Cart & Payment',
    tabOrders: 'My Orders & Invoices',
    tabEmails: 'Email Notifications',
    tabSecurity: 'Account & Password',
    welcomePrefix: 'Welcome',
    browseMyProducts: 'Browse My Products',
    cartItemsStat: 'Cart Items',
    myOrdersStat: 'My Orders',
    pendingPaymentStat: 'Pending Payment',
    accountEmailsStat: 'Account Emails',
    recentOrders: 'Recent Orders',
    viewAll: 'View All',
    purchasedPdfBooks: 'Purchased PDF Books & Digital Library',
    purchasedPdfBooksDesc: 'Instant PDF book downloads unlocked automatically after verified payment.',
    noPurchasedPdfBooks: 'No purchased PDF books yet. Purchase any PDF book to unlock instant download.',
    downloadPdf: 'Download PDF',
    downloadingPdf: 'Downloading...',
    savedWishlistTitle: 'My Wishlist',
    savedWishlistDesc: 'Products and PDF books you saved for later purchase.',
    noWishlistItems: 'Your wishlist is empty. Click the heart icon on any product to save it here.',
    removeWishlistBtn: 'Remove',
    adminCms: 'Admin CMS',
    viewPortfolioSite: 'View Portfolio Site',
    myProfileTitle: 'My Profile',
    saveProfileBtn: 'Save Profile',
    paymentHistoryTitle: 'Payment History & Transactions',
    newsletterTitle: 'Engineering Newsletter',
    newsletterDesc: 'Get notified when new .NET articles, SQL guides, and digital kits are published.',
    subscribeBtn: 'Subscribe',
    liveChatTitle: 'Live Support Chat',
    liveChatSubtitle: 'Chat directly with Pramesh Bhattarai in real time.',
    whatsappChat: 'Chat on WhatsApp',
    commentsTitle: 'Comments',
    leaveCommentTitle: 'Leave a Comment',
    postCommentBtn: 'Post Comment',
    analyticsTitle: 'Analytics & Insights',
    tabStudentPortal: 'Online Classes & Student Portal',
    tabClassVideos: 'Video Lectures',
    tabAttendance: 'My Attendance',
    tabAssignmentsNotices: 'Assignments, Routine & Notices',
    onlineClassesTitle: 'Online Classes & Student Portal',
    liveNowBadge: 'LIVE NOW',
    joinLiveClass: 'Join Live Class',
    watchVideo: 'Watch Video',
    forgotPassword: 'Forgot Password?',
    resetPasswordTitle: 'Reset Your Password',
    tabMessagesCalls: 'Chat, Voice & Video Calls',
    voiceNote: 'Voice Recording',
    startAudioCall: 'Audio Call',
    startVideoCall: 'Video Call',
  },
  ne: {
    // Navbar & General
    navAbout: 'परिचय',
    navExperience: 'अनुभव',
    navEducation: 'शिक्षा',
    navCertifications: 'प्रमाणपत्र',
    navProjects: 'परियोजनाहरू',
    navServices: 'सेवाहरू',
    navArticles: 'लेखहरू',
    navProducts: 'उत्पादनहरू',
    navClasses: 'अनलाइन कक्षा',
    navAchievements: 'उपलब्धिहरू',
    navTestimonials: 'प्रशंसापत्र',
    navSignIn: 'लगइन',
    navSignInRegister: 'लगइन / दर्ता',
    navDashboard: 'ड्यासबोर्ड',
    navMyDashboard: 'मेरो ड्यासबोर्ड',
    navAdmin: 'एडमिन',
    navAdminDashboard: 'एडमिन ड्यासबोर्ड',
    navGetInTouch: 'सम्पर्क गर्नुहोस्',
    navSignOut: 'लगआउट',
    languageLabel: 'ने',
    switchLanguage: 'Switch to English',

    // Hero & Home Sections
    contactMe: 'सम्पर्क गर्नुहोस्',
    downloadCv: 'बायोडाटा डाउनलोड',
    aboutMeTitle: 'मेरो परिचय',
    skillsTitle: 'प्राविधिक सीपहरू',
    experienceTitle: 'कार्य अनुभव',
    educationTitle: 'शैक्षिक योग्यता',
    achievementsTitle: 'उपलब्धि र प्रमाणपत्रहरू',
    projectsTitle: 'परियोजना र केस स्टडी',
    servicesTitle: 'सेवा र क्षमताहरू',
    testimonialsTitle: 'प्रशंसा र सिफारिसहरू',
    contactTitle: 'सम्पर्क गर्नुहोस्',
    sendMessage: 'सन्देश पठाउनुहोस्',
    portalLogin: 'पोर्टल लगइन',
    allRightsReserved: 'सर्वाधिकार सुरक्षित।',

    // Products Storefront
    myProductsTitle: 'मेरो उत्पादनहरू',
    cart: 'कार्ट',
    allCategory: 'सबै',
    wishlistFilter: 'इच्छासूची (Wishlist)',
    pdfBooksBadge: 'PDF पुस्तक',
    searchProductsPlaceholder: 'उत्पादन, PDF पुस्तक वा SKU खोज्नुहोस्...',
    inStock: 'उपलब्ध छ',
    soldOut: 'स्टक समाप्त',
    digitalDelivery: 'डिजिटल डेलिभरी',
    pdfDownloadIncluded: 'तत्काल PDF डाउनलोड',
    details: 'विवरण',
    addToCart: 'कार्टमा थप्नुहोस्',
    buyNow: 'अहिले किन्नुहोस्',
    unavailable: 'अनुपलब्ध',
    noProductsMatch: 'छानिएको वर्गमा कुनै उत्पादन भेटिएन।',
    resetFilters: 'फिल्टर रिसेट गर्नुहोस्',
    backToProducts: 'उत्पादन सूचीमा फर्कनुहोस्',
    addToWishlist: 'इच्छासूचीमा राख्नुहोस्',
    removeFromWishlist: 'इच्छासूचीबाट हटाउनुहोस्',
    overview: 'विवरण',
    whatIsIncluded: 'यसमा के-के समावेश छ',
    quantity: 'परिमाण',
    reviewsTitle: 'ग्राहक मूल्याङ्कन र समीक्षा',
    writeReview: 'समीक्षा लेख्नुहोस्',
    updateReview: 'समीक्षा अद्यावधिक गर्नुहोस्',
    yourRating: 'तपाईंको रेटिङ (तारा)',
    yourReview: 'तपाईंको समीक्षा',
    reviewPlaceholder: 'यस उत्पादन वा PDF पुस्तकको बारेमा आफ्नो अनुभव लेख्नुहोस्...',
    submitReview: 'समीक्षा पठाउनुहोस्',
    submittingReview: 'सुरक्षित गरिँदै...',
    signInToReview: 'रेटिङ र समीक्षा लेख्न कृपया लगइन गर्नुहोस्।',
    noReviewsYet: 'अहिलेसम्म कुनै समीक्षा छैन। पहिलो समीक्षा लेख्नुहोस्।',
    reviewsCountLabel: 'समीक्षा',
    deleteReview: 'हटाउनुहोस्',

    // Cart Drawer
    shoppingCart: 'सपिङ कार्ट',
    checkoutDetails: 'चेकआउट विवरण',
    continueToEsewa: 'eSewa मा जानुहोस्',
    orderConfirmed: 'अर्डर सुनिश्चित भयो',
    proceedToCheckout: 'चेकआउट गर्नुहोस्',
    backToCart: 'कार्टमा फर्कनुहोस्',
    payWithEsewa: 'eSewa बाट तिर्नुहोस्',
    placeOrder: 'अर्डर पक्का गर्नुहोस्',
    continueBrowsing: 'किनमेल जारी राख्नुहोस्',
    cartEmptyTitle: 'तपाईंको कार्ट खाली छ',
    cartEmptyDesc: 'सफ्टवेयर किट, PDF पुस्तक र टेम्प्लेटहरू कार्टमा थप्नुहोस्।',
    browseProductsBtn: 'उत्पादनहरू हेर्नुहोस्',

    // Login / Auth
    backToPortfolio: 'पोर्टफोलियोमा फर्कनुहोस्',
    portalSignIn: 'पोर्टल लगइन',
    portalSignInSubtitle:
      'ड्यासबोर्ड चलाउन, PDF पुस्तक किन्न र डाउनलोड गर्न, कार्ट/भुक्तानी गर्न र समीक्षा दिन लगइन गर्नुहोस्।',
    signInTab: 'लगइन',
    createAccountTab: 'नयाँ खाता',
    fullName: 'पूरा नाम',
    emailAddress: 'इमेल ठेगाना',
    password: 'पासवर्ड',

    // Customer Portal / User Dashboard
    customerPortal: 'ग्राहक पोर्टल',
    tabOverview: 'ड्यासबोर्ड सारांश',
    tabShop: 'उत्पादनहरू हेर्नुहोस्',
    tabWishlist: 'मेरो इच्छासूची',
    tabLibrary: 'PDF पुस्तक पुस्तकालय',
    tabCart: 'मेरो कार्ट र भुक्तानी',
    tabOrders: 'मेरो अर्डर र बिल',
    tabEmails: 'इमेल सूचनाहरू',
    tabSecurity: 'खाता र पासवर्ड',
    welcomePrefix: 'स्वागत छ',
    browseMyProducts: 'उत्पादनहरू हेर्नुहोस्',
    cartItemsStat: 'कार्टमा सामान',
    myOrdersStat: 'मेरो अर्डरहरू',
    pendingPaymentStat: 'बाँकी भुक्तानी',
    accountEmailsStat: 'खाता इमेलहरू',
    recentOrders: 'पछिल्ला अर्डरहरू',
    viewAll: 'सबै हेर्नुहोस्',
    purchasedPdfBooks: 'किनिएका PDF पुस्तक र डिजिटल पुस्तकालय',
    purchasedPdfBooksDesc: 'भुक्तानी प्रमाणित भएपछि PDF पुस्तकहरू सिधै डाउनलोड गर्न सकिन्छ।',
    noPurchasedPdfBooks: 'अहिलेसम्म कुनै PDF पुस्तक किनिएको छैन। डाउनलोड खोल्न PDF पुस्तक खरिद गर्नुहोस्।',
    downloadPdf: 'PDF डाउनलोड गर्नुहोस्',
    downloadingPdf: 'डाउनलोड हुँदैछ...',
    savedWishlistTitle: 'मेरो इच्छासूची (Wishlist)',
    savedWishlistDesc: 'पछिको खरिदका लागि सुरक्षित गरिएका उत्पादन र PDF पुस्तकहरू।',
    noWishlistItems: 'तपाईंको इच्छासूची खाली छ। मन परेको उत्पादनमा हार्ट आइकन थिच्नुहोस्।',
    removeWishlistBtn: 'हटाउनुहोस्',
    adminCms: 'एडमिन CMS',
    viewPortfolioSite: 'मुख्य साइट हेर्नुहोस्',
    myProfileTitle: 'मेरो प्रोफाइल',
    saveProfileBtn: 'प्रोफाइल सुरक्षित गर्नुहोस्',
    paymentHistoryTitle: 'भुक्तानी इतिहास र कारोबार विवरण',
    newsletterTitle: 'न्युजलेटर सदस्यता',
    newsletterDesc: 'नयाँ .NET लेख, SQL गाइड र डिजिटल उत्पादन सार्वजनिक हुँदा इमेलमा जानकारी पाउनुहोस्।',
    subscribeBtn: 'सदस्य बन्नुहोस्',
    liveChatTitle: 'लाइभ सहायता च्याट',
    liveChatSubtitle: 'प्रमेश भट्टराईसँग सिधै रियल-टाइममा कुरा गर्नुहोस्।',
    whatsappChat: 'WhatsApp मा कुरा गर्नुहोस्',
    commentsTitle: 'टिप्पणीहरू',
    leaveCommentTitle: 'टिप्पणी लेख्नुहोस्',
    postCommentBtn: 'टिप्पणी पठाउनुहोस्',
    analyticsTitle: 'एनालिटिक्स र विश्लेषण',
    tabStudentPortal: 'अनलाइन कक्षा र विद्यार्थी पोर्टल',
    tabClassVideos: 'भिडियो पाठहरू',
    tabAttendance: 'मेरो हाजिरी (Attendance)',
    tabAssignmentsNotices: 'गृहकार्य, तालिका र सूचना',
    onlineClassesTitle: 'अनलाइन कक्षा र विद्यार्थी पोर्टल',
    liveNowBadge: 'अहिले लाइभ',
    joinLiveClass: 'लाइभ कक्षामा जोडिनुहोस्',
    watchVideo: 'भिडियो हेर्नुहोस्',
    forgotPassword: 'पासवर्ड बिर्सनुभयो?',
    resetPasswordTitle: 'पासवर्ड रिसेट गर्नुहोस्',
    tabMessagesCalls: 'च्याट, भ्वाइस र भिडियो कल',
    voiceNote: 'भ्वाइस रेकर्डिङ',
    startAudioCall: 'अडियो कल',
    startVideoCall: 'भिडियो कल',
  },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.en;

interface LanguageContextValue {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const DEFAULT_CONTEXT: LanguageContextValue = {
  lang: 'en',
  setLang: () => undefined,
  toggleLang: () => undefined,
  t: (key) => TRANSLATIONS.en[key],
};

const LanguageContext = createContext<LanguageContextValue>(DEFAULT_CONTEXT);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'ne' ? 'ne' : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage failures
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: LanguageCode) => {
    setLangState(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'en' ? 'ne' : 'en'));
  }, []);

  const t = useCallback(
    (key: TranslationKey) => {
      return TRANSLATIONS[lang][key] || TRANSLATIONS.en[key];
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
