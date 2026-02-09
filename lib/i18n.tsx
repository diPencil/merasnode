"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type Language = "en" | "ar"

interface Translations {
  [key: string]: {
    en: string
    ar: string
  }
}

const translations: Translations = {
  // Navigation
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  inbox: { en: "Inbox", ar: "صندوق الوارد" },
  bookings: { en: "Bookings", ar: "الحجوزات" },
  contacts: { en: "Contacts", ar: "جهات الاتصال" },
  templates: { en: "Templates", ar: "القوالب" },
  accounts: { en: "Accounts", ar: "الحسابات" },
  users: { en: "Users", ar: "المستخدمين" },
  logs: { en: "Logs", ar: "السجلات" },
  activityLogs: { en: "Activity Logs", ar: "سجل النشاط" },
  settings: { en: "Settings", ar: "الإعدادات" },

  // Common
  search: { en: "Search", ar: "بحث" },
  add: { en: "Add", ar: "إضافة" },
  edit: { en: "Edit", ar: "تعديل" },
  delete: { en: "Delete", ar: "حذف" },
  save: { en: "Save", ar: "حفظ" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  close: { en: "Close", ar: "إغلاق" },
  back: { en: "Back", ar: "رجوع" },
  next: { en: "Next", ar: "التالي" },
  previous: { en: "Previous", ar: "السابق" },
  loading: { en: "Loading...", ar: "جاري التحميل..." },

  // Inbox
  conversations: { en: "Conversations", ar: "المحادثات" },
  allConversations: { en: "All", ar: "الكل" },
  unread: { en: "Unread", ar: "غير مقروء" },
  archived: { en: "Archived", ar: "المؤرشف" },
  blocked: { en: "Blocked", ar: "محظور" },
  searchConversations: { en: "Search conversations...", ar: "بحث في المحادثات..." },
  typeMessage: { en: "Type a message...", ar: "اكتب رسالة..." },
  sendMessage: { en: "Send", ar: "إرسال" },
  noConversations: { en: "No conversations found", ar: "لا توجد محادثات" },

  // Contacts
  addContact: { en: "Add Contact", ar: "إضافة جهة اتصال" },
  contactDetails: { en: "Contact Details", ar: "تفاصيل جهة الاتصال" },
  searchContacts: { en: "Search contacts...", ar: "بحث في جهات الاتصال..." },
  phone: { en: "Phone", ar: "الهاتف" },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  tags: { en: "Tags", ar: "الوسوم" },
  notes: { en: "Notes", ar: "الملاحظات" },
  followUpDate: { en: "Follow-up Date", ar: "تاريخ المتابعة" },

  // Templates
  createTemplate: { en: "Create Template", ar: "إنشاء قالب" },
  templateName: { en: "Template Name", ar: "اسم القالب" },
  category: { en: "Category", ar: "التصنيف" },
  language: { en: "Language", ar: "اللغة" },
  messageContent: { en: "Message Content", ar: "محتوى الرسالة" },
  approved: { en: "Approved", ar: "معتمد" },
  pending: { en: "Pending", ar: "قيد الانتظار" },
  rejected: { en: "Rejected", ar: "مرفوض" },

  // Bot Flows
  createBotFlow: { en: "Create Bot Flow", ar: "إنشاء سير عمل آلي" },
  botFlows: { en: "Bot Flows", ar: "السيور الآلية" },
  flowTemplates: { en: "Flow Templates", ar: "قوالب السيور" },
  flowStatistics: { en: "Flow Statistics", ar: "إحصائيات السيور" },
  flowBuilder: { en: "Flow Builder", ar: "منشئ السيور" },
  crmIntegration: { en: "CRM Integration", ar: "تكامل CRM" },
  apiKeys: { en: "API Keys", ar: "مفاتيح API" },
  profile: { en: "Profile", ar: "الملف الشخصي" },
  whatsappIntegration: { en: "WhatsApp Integration", ar: "تكامل واتساب" },
  flowName: { en: "Flow Name", ar: "اسم السير" },
  description: { en: "Description", ar: "الوصف" },
  trigger: { en: "Trigger", ar: "المحفز" },
  steps: { en: "Steps", ar: "الخطوات" },
  active: { en: "Active", ar: "نشط" },
  inactive: { en: "Inactive", ar: "غير نشط" },

  // Accounts
  connectAccount: { en: "Connect Account", ar: "ربط حساب" },
  whatsappAccounts: { en: "WhatsApp Accounts", ar: "حسابات واتساب" },
  accountName: { en: "Account Name", ar: "اسم الحساب" },
  phoneNumber: { en: "Phone Number", ar: "رقم الهاتف" },
  provider: { en: "Provider", ar: "مزود الخدمة" },
  connected: { en: "Connected", ar: "متصل" },
  disconnected: { en: "Disconnected", ar: "غير متصل" },
  waiting: { en: "Waiting", ar: "في انتظار" },

  // Users
  inviteUser: { en: "Invite User", ar: "دعوة مستخدم" },
  teamMembers: { en: "Team Members", ar: "أعضاء الفريق" },
  role: { en: "Role", ar: "الدور" },
  status: { en: "Status", ar: "الحالة" },
  online: { en: "Online", ar: "متصل" },
  offline: { en: "Offline", ar: "غير متصل" },
  away: { en: "Away", ar: "بعيد" },

  // Settings
  general: { en: "General", ar: "عام" },
  notifications: { en: "Notifications", ar: "الإشعارات" },
  security: { en: "Security", ar: "الأمان" },
  integrations: { en: "Integrations", ar: "التكاملات" },
  companyName: { en: "Company Name", ar: "اسم الشركة" },
  timezone: { en: "Timezone", ar: "المنطقة الزمنية" },
  saveChanges: { en: "Save Changes", ar: "حفظ التغييرات" },

  // Branches
  branches: { en: "Branches", ar: "الفروع" },
  addBranch: { en: "Add Branch", ar: "إضافة فرع" },
  branchName: { en: "Branch Name", ar: "اسم الفرع" },
  address: { en: "Address", ar: "العنوان" },
  branchDetails: { en: "Branch Details", ar: "تفاصيل الفرع" },

  // Offers
  offers: { en: "Offers", ar: "العروض" },
  createOffer: { en: "Create Offer", ar: "إنشاء عرض" },
  offerTitle: { en: "Offer Title", ar: "عنوان العرض" },
  validFrom: { en: "Valid From", ar: "صالح من" },
  validTo: { en: "Valid To", ar: "صالح حتى" },
  sendOffer: { en: "Send Offer", ar: "إرسال العرض" },
  targetAudience: { en: "Target Audience", ar: "الجمهور المستهدف" },

  // Analytics
  analytics: { en: "Analytics", ar: "التحليلات" },
  totalRevenue: { en: "Total Revenue", ar: "إجمالي الإيرادات" },
  conversationTrends: { en: "Conversation Trends", ar: "اتجاهات المحادثات" },
  responseTime: { en: "Response Time", ar: "وقت الاستجابة" },
  userPerformance: { en: "User Performance", ar: "أداء المستخدمين" },

  // Invoices
  invoices: { en: "Invoices", ar: "الفواتير" },
  createInvoice: { en: "Create Invoice", ar: "إنشاء فاتورة" },
  invoiceNumber: { en: "Invoice Number", ar: "رقم الفاتورة" },
  amount: { en: "Amount", ar: "المبلغ" },
  dueDate: { en: "Due Date", ar: "تاريخ الاستحقاق" },
  paid: { en: "Paid", ar: "مدفوع" },
  overdue: { en: "Overdue", ar: "متأخر" },
  sendInvoice: { en: "Send Invoice", ar: "إرسال الفاتورة" },
  generatePDF: { en: "Generate PDF", ar: "إنشاء PDF" },

  // Referral
  "referral.title": { en: "Referral Program", ar: "برنامج الإحالة" },
  "referral.yourCode": { en: "Your Referral Code", ar: "كود الإحالة الخاص بك" },
  "referral.share": { en: "Share", ar: "مشاركة" },
  "referral.copy": { en: "Copy", ar: "نسخ" },
  "referral.pending": { en: "Pending Points", ar: "نقاط قيد لانتظار" },
  "referral.pointEarned": { en: "Points Earned", ar: "النقاط المكتسبة" },
  "referral.totalReferrals": { en: "Total Referrals", ar: "إجمالي الإحالات" },
  "referral.calculateRewards": { en: "How Rewards Are Calculated", ar: "كيفية احتساب المكافآت" },
  "referral.rewardsDesc": { en: "Earn points when your friends upgrade their membership", ar: "اكسب نقاطًا عندما يقوم أصدقاؤك بترقية عضويتهم" },
  "referral.pointsReward": { en: "Points", ar: "نقاط" },

  // Login
  loginTitle: { en: "Login to Meras", ar: "تسجيل الدخول إلى مراس" },
  loginSubtitle: { en: "Enter your credentials to continue", ar: "أدخل بياناتك للمتابعة" },
  emailLabel: { en: "Email Address", ar: "البريد الإلكتروني" },
  passwordLabel: { en: "Password", ar: "كلمة المرور" },
  rememberMe: { en: "Remember me for 30 days", ar: "تذكرني لمدة 30 يومًا" },
  signIn: { en: "Sign In", ar: "دخول" },
  authorizing: { en: "Authorizing...", ar: "جاري التحقق..." },
  quickAccess: { en: "Quick Access", ar: "وصول سريع" },
  adminAccount: { en: "Admin Account", ar: "حساب الأدمن" },
  tapToFill: { en: "TAP TO FILL", ar: "اضغط للتعبئة" },
  noAccount: { en: "Don't have an account?", ar: "ليس لديك حساب؟" },
  getStarted: { en: "Get started", ar: "ابدأ الآن" },
  loginSuccess: { en: "Login successful", ar: "تم تسجيل الدخول بنجاح" },
  loginFailed: { en: "Login failed", ar: "فشل تسجيل الدخول" },
  invalidCredentials: { en: "Invalid email or password", ar: "البريد أو كلمة المرور غير صحيحة" },
  logout: { en: "Log out", ar: "تسجيل الخروج" },
  merasCrm: { en: "Meras CRM", ar: "مراس CRM" },
  signInToAccount: { en: "Sign in to your account to continue", ar: "سجّل الدخول إلى حسابك للمتابعة" },
  defaultCredentials: { en: "Default credentials:", ar: "بيانات الدخول الافتراضية:" },
  autoFill: { en: "Auto-fill", ar: "تعبئة تلقائية" },
  placeholderEmail: { en: "admin@meras.com", ar: "admin@meras.com" },
  placeholderPassword: { en: "Enter your password", ar: "أدخل كلمة المرور" },
  signingIn: { en: "Signing in...", ar: "جاري تسجيل الدخول..." },
  error: { en: "Error", ar: "خطأ" },
  unexpectedError: { en: "An unexpected error occurred", ar: "حدث خطأ غير متوقع" },
  welcomeBack: { en: "Welcome back", ar: "مرحباً بعودتك" },

  // Inbox / Chat
  failedToSendMessage: { en: "Failed to send message", ar: "فشل إرسال الرسالة" },
  geolocationNotSupported: { en: "Geolocation is not supported by your browser", ar: "المتصفح لا يدعم الموقع الجغرافي" },
  gettingLocation: { en: "Getting Location...", ar: "جاري الحصول على الموقع..." },
  pleaseAllowLocation: { en: "Please allow location access if prompted.", ar: "الرجاء السماح بالوصول للموقع إذا طُلب منك." },
  locationAccessDenied: { en: "Location access denied", ar: "تم رفض الوصول للموقع" },
  failedToGetLocation: { en: "Failed to get location", ar: "فشل الحصول على الموقع" },
  flowStarted: { en: "Flow Started", ar: "تم بدء السير" },
  flowStartedDesc: { en: "Bot flow has been initiated and logged.", ar: "تم بدء السير الآلي وتسجيله." },
  failedToResolveConversation: { en: "Failed to resolve conversation", ar: "فشل حل المحادثة" },
  exportFailed: { en: "Export Failed", ar: "فشل التصدير" },
  noMessagesToExport: { en: "No messages to export", ar: "لا توجد رسائل للتصدير" },
  exported: { en: "Exported", ar: "تم التصدير" },
  chatExportedSuccessfully: { en: "Chat exported successfully", ar: "تم تصدير المحادثة بنجاح" },
  conversationResolved: { en: "Conversation Resolved", ar: "تم حل المحادثة" },
  conversationResolvedDesc: { en: "Great job! The conversation has been marked as resolved.", ar: "أحسنت! تم تحديد المحادثة كمُحَلّة." },
  contactBlocked: { en: "Contact has been blocked", ar: "تم حظر جهة الاتصال" },
  failedToBlockContact: { en: "Failed to block contact", ar: "فشل حظر جهة الاتصال" },
  voiceNoteSent: { en: "Voice note sent", ar: "تم إرسال المذكرة الصوتية" },
  failedToSendVoiceNote: { en: "Failed to send voice note", ar: "فشل إرسال المذكرة الصوتية" },
  microphoneDenied: { en: "Microphone access denied or not supported", ar: "الوصول للميكروفون مرفوض أو غير مدعوم" },
  fillRequiredFields: { en: "Please fill in all required fields", ar: "يرجى تعبئة جميع الحقول المطلوبة" },
  bookingConfirmed: { en: "Booking Confirmed", ar: "تم تأكيد الحجز" },
  bookingConfirmedDesc: { en: "Successfully booked with Agent.", ar: "تم الحجز بنجاح مع الموظف." },
  failedToCreateBooking: { en: "Failed to create booking. Please try again.", ar: "فشل إنشاء الحجز. يرجى المحاولة مرة أخرى." },
  comingSoon: { en: "Coming Soon", ar: "قريباً" },
  comingSoonDesc: { en: "integration is coming soon!", ar: "التكامل قريباً!" },
  selectBranch: { en: "Select Branch", ar: "اختر الفرع" },
  allBranches: { en: "All Branches", ar: "جميع الفروع" },
  searchNameOrPhone: { en: "Search name or phone...", ar: "بحث بالاسم أو الهاتف..." },
  filters: { en: "Filters", ar: "تصفية" },
  unreadOnly: { en: "Unread Only", ar: "غير المقروء فقط" },
  groupsOnly: { en: "Groups Only", ar: "المجموعات فقط" },
  filterConversations: { en: "Filter Conversations", ar: "تصفية المحادثات" },
  allChats: { en: "All Chats", ar: "جميع المحادثات" },
  noMessagesYet: { en: "No messages yet", ar: "لا توجد رسائل بعد" },
  book: { en: "Book", ar: "حجز" },
  bookAppointment: { en: "Book Appointment", ar: "حجز موعد" },
  createBookingFor: { en: "Create a new booking for", ar: "إنشاء حجز جديد لـ" },
  agent: { en: "Agent", ar: "الموظف" },
  selectAgent: { en: "Select agent", ar: "اختر الموظف" },
  addNotesPlaceholder: { en: "Add notes...", ar: "أضف ملاحظات..." },
  confirmBooking: { en: "Confirm Booking", ar: "تأكيد الحجز" },
  resolve: { en: "Resolve", ar: "حل" },
  saving: { en: "Saving...", ar: "جاري الحفظ..." },
  chatOptions: { en: "Chat Options", ar: "خيارات المحادثة" },
  messageTemplates: { en: "Message Templates", ar: "قوالب الرسائل" },
  exportChat: { en: "Export Chat", ar: "تصدير المحادثة" },
  blockContact: { en: "Block Contact", ar: "حظر جهة الاتصال" },
  selectMessageTemplate: { en: "Select a Message Template", ar: "اختر قالب رسالة" },
  chooseTemplateToInsert: { en: "Choose a template to quickly insert into the chat.", ar: "اختر قالباً لإدراجه في المحادثة." },
  noTemplatesFound: { en: "No templates found. Go to Templates settings to create one.", ar: "لا توجد قوالب. اذهب إلى إعدادات القوالب لإنشاء واحد." },
  selectBotFlow: { en: "Select a Bot Flow", ar: "اختر سيراً آلياً" },
  manuallyTriggerFlow: { en: "Manually trigger an automated flow for this contact.", ar: "تشغيل سير آلي يدوياً لهذه الجهة." },
  noActiveBotFlows: { en: "No active bot flows found.", ar: "لا توجد سيور آلية نشطة." },
  clickToStartFlow: { en: "Click to start this automation flow.", ar: "انقر لبدء هذا السير الآلي." },
  lastActiveAgo: { en: "Last active", ar: "آخر نشاط" },
  fileSentSuccessfully: { en: "File sent successfully", ar: "تم إرسال الملف بنجاح" },
  failedToSendFile: { en: "Failed to send file", ar: "فشل إرسال الملف" },
  typeYourMessage: { en: "Type your message...", ar: "اكتب رسالتك..." },
  sent: { en: "Sent", ar: "تم الإرسال" },
  group: { en: "Group", ar: "مجموعة" },
  blockConfirm: { en: "Are you sure you want to block this contact? They will be marked as blocked and the conversation will be archived.", ar: "هل أنت متأكد من حظر جهة الاتصال؟ سيتم وضع علامة محظور عليها وأرشفة المحادثة." },

  // Contacts page
  importContacts: { en: "Import", ar: "استيراد" },
  exportContacts: { en: "Export", ar: "تصدير" },
  allContacts: { en: "All", ar: "الكل" },
  blockedContacts: { en: "Blocked", ar: "المحظورون" },
  noContactsFound: { en: "No contacts found", ar: "لا توجد جهات اتصال" },
  deleteContact: { en: "Delete Contact", ar: "حذف جهة الاتصال" },
  deleteContactConfirm: { en: "Are you sure you want to delete this contact?", ar: "هل أنت متأكد من حذف جهة الاتصال؟" },
  unblockContact: { en: "Unblock", ar: "إلغاء الحظر" },
  blockContactConfirm: { en: "Block this contact?", ar: "حظر جهة الاتصال؟" },
  nameLabel: { en: "Name", ar: "الاسم" },
  contactSaved: { en: "Contact saved", ar: "تم حفظ جهة الاتصال" },
  contactDeleted: { en: "Contact deleted", ar: "تم حذف جهة الاتصال" },
  failedToSaveContact: { en: "Failed to save contact", ar: "فشل حفظ جهة الاتصال" },
  failedToDeleteContact: { en: "Failed to delete contact", ar: "فشل حذف جهة الاتصال" },
  validationError: { en: "Validation Error", ar: "خطأ في التحقق" },
  nameAndPhoneRequired: { en: "Name and phone are required", ar: "الاسم والهاتف مطلوبان" },
  noData: { en: "No Data", ar: "لا توجد بيانات" },
  noContactsToExport: { en: "There are no contacts to export.", ar: "لا توجد جهات اتصال للتصدير." },
  exportSuccessful: { en: "Export Successful", ar: "تم التصدير بنجاح" },
  contactsExportedToCsv: { en: "Contacts exported to CSV.", ar: "تم تصدير جهات الاتصال إلى CSV." },
  importError: { en: "Import Error", ar: "خطأ في الاستيراد" },
  noValidContactsInCsv: { en: "No valid contacts found in CSV.", ar: "لم يتم العثور على جهات اتصال صالحة في الملف." },
  importSuccessful: { en: "Import Successful", ar: "تم الاستيراد بنجاح" },
  importedCount: { en: "Imported", ar: "تم استيراد" },
  failedToImportContacts: { en: "Failed to import contacts", ar: "فشل استيراد جهات الاتصال" },
  importFailed: { en: "Import Failed", ar: "فشل الاستيراد" },
  couldNotParseCsv: { en: "Could not parse the CSV file.", ar: "تعذر قراءة ملف CSV." },
  failedToCreateConversation: { en: "Failed to create conversation", ar: "فشل إنشاء المحادثة" },
  contactDeletedSuccessfully: { en: "Contact deleted successfully", ar: "تم حذف جهة الاتصال بنجاح" },
  failedToConnectToServer: { en: "Failed to connect to server", ar: "فشل الاتصال بالخادم" },
  contactUpdatedSuccessfully: { en: "Contact updated successfully", ar: "تم تحديث جهة الاتصال بنجاح" },
  contactUnblocked: { en: "Contact unblocked", ar: "تم إلغاء حظر جهة الاتصال" },
  contactBlockedSuccess: { en: "Contact blocked", ar: "تم حظر جهة الاتصال" },
  failedToUpdateContact: { en: "Failed to update contact", ar: "فشل تحديث جهة الاتصال" },
  contactAddedSuccessfully: { en: "Contact added successfully", ar: "تم إضافة جهة الاتصال بنجاح" },
  failedToAddContact: { en: "Failed to add contact", ar: "فشل إضافة جهة الاتصال" },
  yourContacts: { en: "Your Contacts", ar: "جهات اتصالك" },
  total: { en: "Total", ar: "الإجمالي" },
  adding: { en: "Adding...", ar: "جاري الإضافة..." },

  // Bookings page
  bookingNumber: { en: "Booking #", ar: "حجز #" },
  dateLabel: { en: "Date", ar: "التاريخ" },
  noBookingsFound: { en: "No bookings found", ar: "لا توجد حجوزات" },
  createBooking: { en: "Create Booking", ar: "إنشاء حجز" },
  bookingCreated: { en: "Booking created", ar: "تم إنشاء الحجز" },
  bookingUpdated: { en: "Booking updated", ar: "تم تحديث الحجز" },
  bookingDeleted: { en: "Booking deleted", ar: "تم حذف الحجز" },
  confirmDelete: { en: "Are you sure?", ar: "هل أنت متأكد؟" },

  // Templates page
  searchPlaceholder: { en: "Search...", ar: "بحث..." },
  templateCreated: { en: "Template created", ar: "تم إنشاء القالب" },
  templateUpdated: { en: "Template updated", ar: "تم تحديث القالب" },
  templateDeleted: { en: "Template deleted", ar: "تم حذف القالب" },
  noTemplates: { en: "No templates yet", ar: "لا توجد قوالب بعد" },
  generalCategory: { en: "General", ar: "عام" },

  // Users page
  addUser: { en: "Add User", ar: "إضافة مستخدم" },
  admin: { en: "Admin", ar: "مدير" },
  supervisor: { en: "Supervisor", ar: "مشرف" },
  agentRole: { en: "Agent", ar: "موظف" },
  lastLogin: { en: "Last Login", ar: "آخر دخول" },
  actions: { en: "Actions", ar: "إجراءات" },
  userCreated: { en: "User created", ar: "تم إنشاء المستخدم" },
  userUpdated: { en: "User updated", ar: "تم تحديث المستخدم" },
  userDeactivated: { en: "User deactivated", ar: "تم إلغاء تفعيل المستخدم" },
  failedToSaveUser: { en: "Failed to save user", ar: "فشل حفظ المستخدم" },
  confirmPassword: { en: "Confirm Password", ar: "تأكيد كلمة المرور" },

  // Settings page
  success: { en: "Success", ar: "تم بنجاح" },
  generalSettingsSaved: { en: "General settings saved", ar: "تم حفظ الإعدادات العامة" },
  profileSettings: { en: "Profile", ar: "الملف الشخصي" },
  profileUpdated: { en: "Profile updated", ar: "تم تحديث الملف الشخصي" },
  securitySettings: { en: "Security", ar: "الأمان" },
  currentPassword: { en: "Current Password", ar: "كلمة المرور الحالية" },
  newPassword: { en: "New Password", ar: "كلمة المرور الجديدة" },
  passwordUpdated: { en: "Password updated", ar: "تم تحديث كلمة المرور" },
  twoFactorAuth: { en: "Two-Factor Authentication", ar: "المصادقة الثنائية" },
  newMessagesNotif: { en: "New messages", ar: "رسائل جديدة" },
  assignmentNotif: { en: "Conversation assignment", ar: "تعيين المحادثات" },
  templateNotif: { en: "Template updates", ar: "تحديثات القوالب" },
  dailySummaryNotif: { en: "Daily summary", ar: "ملخص يومي" },
  companyLogo: { en: "Company Logo", ar: "شعار الشركة" },
  displayAs: { en: "Display as", ar: "العرض كـ" },
  textDisplay: { en: "Text", ar: "نص" },
  logoDisplay: { en: "Logo", ar: "شعار" },

  // Dashboard & Top bar
  goodMorning: { en: "Good Morning", ar: "صباح الخير" },
  goodAfternoon: { en: "Good Afternoon", ar: "مساء الخير" },
  goodEvening: { en: "Good Evening", ar: "مساء الخير" },
  averageResponseTime: { en: "Average Response Time", ar: "متوسط وقت الاستجابة" },
  activeContacts: { en: "Active Contacts", ar: "جهات الاتصال النشطة" },
  whatsappMessages: { en: "WhatsApp Messages", ar: "رسائل واتساب" },
  viewResponseAnalytics: { en: "View Response Analytics", ar: "عرض تحليلات الاستجابة" },
  targetTimeGoal: { en: "Target Time Goal", ar: "الهدف الزمني" },
  currentAverage: { en: "Current Average", ar: "المتوسط الحالي" },
  today: { en: "Today", ar: "اليوم" },
  activeNow: { en: "Active Now", ar: "نشط الآن" },
  fromLastWeek: { en: "from last week", ar: "من الأسبوع الماضي" },
  messagesSentThisMonth: { en: "messages sent this month", ar: "رسائل أُرسلت هذا الشهر" },
  recentConversations: { en: "Recent Conversations", ar: "المحادثات الأخيرة" },
  messagesActivity: { en: "Messages Activity", ar: "نشاط الرسائل" },
  week: { en: "Week", ar: "أسبوع" },
  month: { en: "Month", ar: "شهر" },
  noMessageActivityYet: { en: "No Message Activity Yet", ar: "لا يوجد نشاط رسائل بعد" },
  startSendingMessagesTrends: { en: "Start sending and receiving messages to see your activity trends here.", ar: "ابدأ بإرسال واستقبال الرسائل لرؤية اتجاهات النشاط هنا." },
  noConversationsYet: { en: "No Conversations Yet", ar: "لا توجد محادثات بعد" },
  recentConversationsAppearHere: { en: "Your recent conversations will appear here once you start chatting.", ar: "ستظهر محادثاتك الأخيرة هنا بمجرد بدء الدردشة." },
  messageTypes: { en: "Message Types", ar: "أنواع الرسائل" },
  messageTypeDistribution: { en: "Message type distribution will appear here once you start messaging.", ar: "سيظهر توزيع أنواع الرسائل هنا بمجرد بدء المراسلة." },
  addAccount: { en: "Add Account", ar: "إضافة حساب" },
  noWhatsAppAccounts: { en: "No WhatsApp Accounts", ar: "لا توجد حسابات واتساب" },
  connectWhatsAppToStart: { en: "Connect your WhatsApp account to start managing conversations.", ar: "اربط حساب واتساب لبدء إدارة المحادثات." },
  addYourFirstAccount: { en: "Add Your First Account", ar: "أضف حسابك الأول" },
  teamPerformance: { en: "Team Performance", ar: "أداء الفريق" },
  mainBranch: { en: "Main Branch", ar: "الفرع الرئيسي" },
  viewSystemLogs: { en: "View System Logs", ar: "عرض سجلات النظام" },
  liveSupportStatus: { en: "Live Support Status", ar: "حالة الدعم المباشر" },
  system: { en: "System", ar: "النظام" },
  uptime: { en: "Uptime", ar: "وقت التشغيل" },
  agentEfficiency: { en: "Agent Efficiency", ar: "كفاءة الموظفين" },
  peakActivity: { en: "Peak Activity", ar: "ذروة النشاط" },
  topPerformer: { en: "Top Performer", ar: "الأفضل أداءً" },
  momentum: { en: "Momentum", ar: "الزخم" },
  fastGrowth: { en: "Fast Growth", ar: "نمو سريع" },
  confidenceLevel: { en: "Confidence Level", ar: "مستوى الثقة" },
  responseRate: { en: "Response Rate", ar: "معدل الاستجابة" },
  vsLast7Days: { en: "Vs Last 7 Days", ar: "مقارنة بآخر 7 أيام" },
  trending: { en: "TRENDING", ar: "في ارتفاع" },
  declining: { en: "DECLINING", ar: "في انخفاض" },
  aiAnalyticsInsights: { en: "AI Analytics Insights", ar: "رؤى تحليلات الذكاء الاصطناعي" },
  peakActivityTitle: { en: "Peak Activity", ar: "ذروة النشاط" },
  topPerformerTitle: { en: "Top Performer", ar: "الأفضل أداءً" },
  momentumTitle: { en: "Momentum", ar: "الزخم" },
  stable: { en: "Stable", ar: "مستقر" },
  stableBadge: { en: "STABLE", ar: "مستقر" },
  fastGrowthLabel: { en: "Fast Growth", ar: "نمو سريع" },
  decliningLabel: { en: "Declining", ar: "في انخفاض" },
  vsLast7DaysLabel: { en: "Vs Last 7 Days", ar: "مقارنة بآخر 7 أيام" },
  usedTimes: { en: "Used {n} times", ar: "استُخدم {n} مرات" },
  vsAvg: { en: "vs Avg", ar: "مقارنة بالمعدل" },
  healthy: { en: "Healthy", ar: "سليم" },
  degraded: { en: "Degraded", ar: "تدهور" },
  noAccounts: { en: "No Accounts", ar: "لا توجد حسابات" },
  optimal: { en: "Optimal", ar: "مثالي" },
  good: { en: "Good", ar: "جيد" },
  fair: { en: "Fair", ar: "مقبول" },
  needsImprovement: { en: "Needs Improvement", ar: "يحتاج تحسين" },
  customerSatisfaction: { en: "Customer Satisfaction", ar: "رضا العملاء" },
  slaCompliance: { en: "SLA Compliance", ar: "الالتزام بمعايير الخدمة" },
  alphaBeta: { en: "Alpha Beta", ar: "ألفا بيتا" },
  loadingDashboard: { en: "Loading dashboard...", ar: "جاري تحميل لوحة التحكم..." },
  markAllAsRead: { en: "Mark all as read", ar: "تعليم الكل كمقروء" },
  clearAll: { en: "Clear all", ar: "مسح الكل" },
  allCaughtUp: { en: "All caught up!", ar: "كل شيء محدث!" },
  noNewNotifications: { en: "No new notifications for now.", ar: "لا توجد إشعارات جديدة حالياً." },
  newCount: { en: "New", ar: "جديد" },
  view: { en: "View", ar: "عرض" },
  incoming: { en: "Incoming", ar: "واردة" },
  outgoing: { en: "Outgoing", ar: "صادرة" },

  // Top bar & user menu
  myAccount: { en: "My Account", ar: "حسابي" },
  userLabel: { en: "User", ar: "مستخدم" },

  // Inbox - empty & selection
  noConversationSelected: { en: "No Conversation Selected", ar: "لم يتم اختيار محادثة" },
  selectConversationToView: { en: "Select a conversation from the list to view details and start chatting.", ar: "اختر محادثة من القائمة لعرض التفاصيل وبدء الدردشة." },

  // Contacts - labels & placeholders
  loadingContacts: { en: "Loading contacts...", ar: "جاري تحميل جهات الاتصال..." },
  contactDetailsTitle: { en: "Contact Details", ar: "تفاصيل جهة الاتصال" },
  viewAndManageContact: { en: "View and manage contact information", ar: "عرض وإدارة معلومات جهة الاتصال" },
  noTags: { en: "No tags", ar: "لا توجد وسوم" },
  addNewContact: { en: "Add New Contact", ar: "إضافة جهة اتصال جديدة" },
  addNewContactDesc: { en: "Add a new contact to your list", ar: "إضافة جهة اتصال جديدة إلى قائمتك" },
  nameRequired: { en: "Name *", ar: "الاسم *" },
  phoneRequired: { en: "Phone *", ar: "الهاتف *" },
  tagsCommaSeparated: { en: "Tags (comma separated)", ar: "الوسوم (مفصولة بفواصل)" },
  placeholderName: { en: "John Doe", ar: "الاسم الكامل" },
  placeholderPhone: { en: "+1234567890", ar: "+966501234567" },
  placeholderEmailExample: { en: "john@example.com", ar: "example@email.com" },
  placeholderTags: { en: "customer, vip, lead", ar: "عميل، مميز، محتمل" },
  additionalNotes: { en: "Additional notes...", ar: "ملاحظات إضافية..." },
  editContactTitle: { en: "Edit Contact", ar: "تعديل جهة الاتصال" },
  updateContactInfo: { en: "Update contact information", ar: "تحديث معلومات جهة الاتصال" },
  deleteContactTitle: { en: "Delete Contact", ar: "حذف جهة الاتصال" },

  // Inbox Sidebar
  newLead: { en: "New Lead", ar: "عميل محتمل" },
  contactInformation: { en: "Contact Information", ar: "معلومات جهة الاتصال" },
  assignedAgent: { en: "Assigned Agent", ar: "الموظف المعيّن" },
  loadingNotes: { en: "Loading notes...", ar: "جاري تحميل الملاحظات..." },
  noNotesYet: { en: "No notes yet", ar: "لا توجد ملاحظات بعد" },
  selectPlaceholder: { en: "Select", ar: "اختر" },
  regular: { en: "Regular", ar: "عادي" },
  unassigned: { en: "Unassigned", ar: "غير معيّن" },
  tagsPlaceholder: { en: "vip, new lead...", ar: "مميز، عميل محتمل..." },
  writeNotePlaceholder: { en: "Write a note...", ar: "اكتب ملاحظة..." },

  // Inbox - lead status & labels (unified terminology)
  leadStatusNew: { en: "New", ar: "جديد" },
  leadStatusBooked: { en: "Booked", ar: "محجوز" },
  leadStatusInProgress: { en: "In Progress", ar: "قيد التنفيذ" },
  scanningCount: { en: "Scanning ({n})", ar: "جاري المسح ({n})" },
  recommendStartFlow: { en: "Recommend: Start \"{name}\"?", ar: "التوصية: بدء \"{name}\"؟" },
  autoDetectedTrigger: { en: "Auto-detected keyword matching trigger: \"{trigger}\"", ar: "تطابق تلقائي للمحفز: \"{trigger}\"" },
  dismiss: { en: "Dismiss", ar: "تجاهل" },
  useFlow: { en: "Use Flow", ar: "استخدام السير" },
  groupChat: { en: "Group Chat", ar: "دردشة جماعية" },
  leadCustomer: { en: "Lead Customer", ar: "عميل محتمل" },
  branchLabel: { en: "Branch", ar: "الفرع" },
  statusLabel: { en: "Status", ar: "الحالة" },
  metaId: { en: "Meta ID", ar: "معرّف Meta" },
  locationLabel: { en: "Location", ar: "الموقع" },
  downloadLabel: { en: "Download", ar: "تنزيل" },
  openInMaps: { en: "Open in Maps", ar: "فتح في الخرائط" },
  clickToViewInMaps: { en: "Click to view location in Google Maps", ar: "انقر لعرض الموقع في خرائط Google" },
  documentLabel: { en: "Document", ar: "مستند" },
  minutesAgo: { en: "{n} min", ar: "منذ {n} د" },
  debugMatchFound: { en: "DEBUG: Match Found ({name})", ar: "تصحيح: تطابق ({name})" },

  // WhatsApp accounts
  manageWhatsAppAccounts: { en: "Manage your WhatsApp business accounts", ar: "إدارة حسابات واتساب للأعمال" },
  connectWhatsAppAccount: { en: "Connect WhatsApp Account", ar: "ربط حساب واتساب" },
  chooseConnectionMethod: { en: "Choose your connection method", ar: "اختر طريقة الربط" },
  metaCloudApi: { en: "Meta Cloud API", ar: "واجهة Meta السحابية" },
  placeholderAccountName: { en: "e.g., Main Sales Number", ar: "مثال: رقم المبيعات الرئيسي" },
  phoneNumberId: { en: "Phone Number ID", ar: "معرّف رقم الهاتف" },
  businessAccountId: { en: "Business Account ID", ar: "معرّف حساب الأعمال" },
  accessToken: { en: "Access Token", ar: "رمز الوصول" },
  webhookVerifyToken: { en: "Webhook Verify Token", ar: "رمز التحقق من الويب هوك" },
  placeholderPhoneNumberId: { en: "Enter phone number ID from Meta", ar: "أدخل معرّف الرقم من Meta" },
  placeholderBusinessId: { en: "Enter business account ID", ar: "أدخل معرّف حساب الأعمال" },
  placeholderAccessToken: { en: "Enter your access token", ar: "أدخل رمز الوصول" },
  placeholderVerifyToken: { en: "Create a verify token", ar: "أنشئ رمز تحقق" },
  supportLineExample: { en: "e.g., Support Line", ar: "مثال: خط الدعم" },
  initializingClient: { en: "Initializing Client...", ar: "جاري تهيئة العميل..." },
  waitingForQr: { en: "Waiting for QR...", ar: "في انتظار رمز QR..." },
  waitingForScan: { en: "Waiting for scan...", ar: "في انتظار المسح..." },
  totalAccounts: { en: "Total Accounts", ar: "إجمالي الحسابات" },
  accountsList: { en: "Accounts List", ar: "قائمة الحسابات" },
  viewManageAccounts: { en: "View and manage all your WhatsApp accounts", ar: "عرض وإدارة جميع حسابات واتساب" },
  loadingAccounts: { en: "Loading accounts...", ar: "جاري تحميل الحسابات..." },
  noWhatsAppAccountsConnected: { en: "No WhatsApp accounts connected", ar: "لا توجد حسابات واتساب مربوطة" },
  connectedDate: { en: "Connected Date", ar: "تاريخ الربط" },
  connectAccountButton: { en: "Connect Account", ar: "ربط الحساب" },

  // WhatsApp page
  connectionStatus: { en: "Connection Status", ar: "حالة الاتصال" },
  scanWithWhatsApp: { en: "Scan this code with WhatsApp", ar: "امسح هذا الرمز بواسطة واتساب" },

  // Profile
  manageAccountInfo: { en: "Manage your account information", ar: "إدارة معلومات حسابك" },
  profilePicture: { en: "Profile Picture", ar: "صورة الملف الشخصي" },
  imageUrlPlaceholder: { en: "Image URL or path", ar: "رابط الصورة أو المسار" },
  enterYourName: { en: "Enter your name", ar: "أدخل اسمك" },

  // Integrations API
  manageApiKeys: { en: "Manage your API keys and access tokens", ar: "إدارة مفاتيح API ورموز الوصول" },
  createNewApiKey: { en: "Create New API Key", ar: "إنشاء مفتاح API جديد" },
  keyName: { en: "Key Name", ar: "اسم المفتاح" },
  expiresIn: { en: "Expires In", ar: "ينتهي خلال" },
  placeholderApiKeyName: { en: "e.g., Production API Key", ar: "مثال: مفتاح الإنتاج" },
  noApiKeysYet: { en: "No API keys yet", ar: "لا توجد مفاتيح API بعد" },

  // Integrations CRM
  connectCrmDesc: { en: "Connect your CRM system to sync contacts and data", ar: "اربط نظام CRM لمزامنة جهات الاتصال والبيانات" },
  connectCrmSystem: { en: "Connect CRM System", ar: "ربط نظام CRM" },
  zohoCrm: { en: "Zoho CRM", ar: "Zoho CRM" },
  crmProvider: { en: "CRM Provider", ar: "مزود CRM" },
  apiSecretOptional: { en: "API Secret (Optional)", ar: "سر API (اختياري)" },
  placeholderApiKey: { en: "Enter your API key", ar: "أدخل مفتاح API" },
  placeholderApiSecret: { en: "Enter your API secret", ar: "أدخل سر API" },
  noCrmIntegrationsYet: { en: "No CRM integrations yet", ar: "لا توجد تكاملات CRM بعد" },

  // Bot flows templates
  flowTemplatesTitle: { en: "Flow Templates", ar: "قوالب السيور" },
  choosePrebuiltTemplates: { en: "Choose from pre-built automation templates", ar: "اختر من قوالب الأتمتة الجاهزة" },
  noFlowTemplatesFound: { en: "No templates found", ar: "لم يتم العثور على قوالب" },
  tryAdjustingSearch: { en: "Try adjusting your search or filters", ar: "جرّب تغيير البحث أو التصفية" },
  needCustomFlow: { en: "Need a Custom Flow?", ar: "تحتاج سيراً مخصصاً؟" },

  // Bot flows stats
  flowPerformance: { en: "Flow Performance", ar: "أداء السير" },
  analyticsId: { en: "Analytics ID", ar: "معرّف التحليلات" },
  totalMessages: { en: "Total Messages", ar: "إجمالي الرسائل" },
  flowCompletions: { en: "Flow Completions", ar: "إكمالات السير" },
  buttonClicks: { en: "Button Clicks", ar: "نقرات الأزرار" },
  conversionRate: { en: "Conversion Rate", ar: "معدل التحويل" },
  interactionsInsight: { en: "Interactions Insight", ar: "رؤى التفاعلات" },
  interactionsInsightDesc: { en: "Visualizing conversation volume vs successful completions.", ar: "عرض حجم المحادثات مقابل الإكمالات الناجحة." },
  frictionPointsDesc: { en: "Identifying friction points in the flow.", ar: "تحديد نقاط الاحتكاك في السير." },
  livePulse: { en: "Live Pulse", ar: "النبض المباشر" },
  customerEntity: { en: "Customer Entity", ar: "جهة العميل" },
  timeRegistered: { en: "Time Registered", ar: "وقت التسجيل" },
  statusMatrix: { en: "Status Matrix", ar: "مصفوفة الحالة" },

  // Settings toasts & errors
  failedToSaveSettings: { en: "Failed to save settings", ar: "فشل حفظ الإعدادات" },
  pleaseUploadImage: { en: "Please upload an image file", ar: "يرجى رفع ملف صورة" },
  tryAgain: { en: "Try Again", ar: "حاول مرة أخرى" },
  noContactsMatchingSearch: { en: "No contacts found matching your search", ar: "لا توجد جهات اتصال تطابق البحث" },
  noBlockedContactsFound: { en: "No blocked contacts found", ar: "لا توجد جهات اتصال محظورة" },
  noContactsYetAddFirst: { en: "No contacts yet. Add your first contact!", ar: "لا توجد جهات اتصال بعد. أضف أول جهة اتصال!" },
  sendMessageButton: { en: "Send Message", ar: "إرسال رسالة" },
  updateContact: { en: "Update Contact", ar: "تحديث جهة الاتصال" },
  updating: { en: "Updating...", ar: "جاري التحديث..." },
  deleteContactConfirmDesc: { en: "Are you sure you want to delete this contact? This action cannot be undone.", ar: "هل أنت متأكد من حذف جهة الاتصال؟ لا يمكن التراجع عن هذا الإجراء." },
  channel: { en: "Channel", ar: "القناة" },
  whatsApp: { en: "WhatsApp", ar: "واتساب" },
  recentNotes: { en: "Recent Notes", ar: "الملاحظات الأخيرة" },
  addLabel: { en: "+ Add", ar: "+ إضافة" },
  saveNote: { en: "Save Note", ar: "حفظ الملاحظة" },
  saveTags: { en: "Save Tags", ar: "حفظ الوسوم" },
  qualified: { en: "Qualified", ar: "مؤهل" },
  vip: { en: "VIP", ar: "مميز" },
  systemLabel: { en: "System", ar: "النظام" },
  whatsAppWeb: { en: "WhatsApp Web", ar: "واتساب ويب" },
  generateQrCode: { en: "Generate QR Code", ar: "إنشاء رمز QR" },
  allWhatsAppAccounts: { en: "All WhatsApp accounts", ar: "جميع حسابات واتساب" },
  activeConnections: { en: "Active connections", ar: "اتصالات نشطة" },
  inactiveConnections: { en: "Inactive connections", ar: "اتصالات غير نشطة" },
  connectFirstAccount: { en: "Connect your first account", ar: "اربط حسابك الأول" },
  apiKeyLabel: { en: "API Key", ar: "مفتاح API" },
  createApiKey: { en: "Create API Key", ar: "إنشاء مفتاح API" },

  // Settings page - General & tabs
  generalSettings: { en: "General Settings", ar: "الإعدادات العامة" },
  manageAppPreferences: { en: "Manage your application preferences", ar: "إدارة تفضيلات التطبيق" },
  companyDisplayType: { en: "Company Display Type", ar: "نوع عرض الشركة" },
  textCompanyName: { en: "Text (Company Name)", ar: "نص (اسم الشركة)" },
  logoImage: { en: "Logo (Image)", ar: "شعار (صورة)" },
  yourCompanyName: { en: "Your Company Name", ar: "اسم شركتك" },
  nameAppearsInSidebar: { en: "This name will appear in the sidebar", ar: "سيظهر هذا الاسم في الشريط الجانبي" },
  uploadLogoHint: { en: "Upload a logo image (max 5MB). This will appear in the sidebar", ar: "ارفع صورة شعار (حد أقصى 5 ميجا). ستظهر في الشريط الجانبي" },
  chooseFile: { en: "Choose File", ar: "اختر ملف" },
  noFileChosen: { en: "No file chosen", ar: "لم يتم اختيار ملف" },
  defaultLanguage: { en: "Default Language", ar: "اللغة الافتراضية" },
  english: { en: "English", ar: "English" },
  arabic: { en: "Arabic", ar: "العربية" },
  languageChanged: { en: "Language Changed", ar: "تم تغيير اللغة" },

  // Settings - Notifications
  notificationPreferences: { en: "Notification Preferences", ar: "تفضيلات الإشعارات" },
  chooseNotifications: { en: "Choose what notifications you want to receive", ar: "اختر الإشعارات التي تريد استلامها" },
  newMessagesLabel: { en: "New Messages", ar: "رسائل جديدة" },
  getNotifiedNewMessages: { en: "Get notified when new messages arrive", ar: "إشعارك عند وصول رسائل جديدة" },
  assignmentAlerts: { en: "Assignment Alerts", ar: "تنبيهات التعيين" },
  notifyWhenAssigned: { en: "Notify when conversations are assigned to you", ar: "إشعارك عند تعيين محادثات لك" },
  templateUpdatesLabel: { en: "Template Updates", ar: "تحديثات القوالب" },
  templateApprovalStatus: { en: "Get notified about template approval status", ar: "إشعارك بحالة اعتماد القوالب" },
  dailySummaryLabel: { en: "Daily Summary", ar: "الملخص اليومي" },
  dailySummaryEmails: { en: "Receive daily activity summary emails", ar: "استلام ملخص النشاط اليومي بالبريد" },
  changesSavedAutomatically: { en: "Changes are saved automatically", ar: "يتم حفظ التغييرات تلقائياً" },

  // Settings - Security / Profile
  updatePasswordProfile: { en: "Update your password and profile security", ar: "تحديث كلمة المرور وأمان الملف الشخصي" },
  manageAccountSecurity: { en: "Manage your account security", ar: "إدارة أمان حسابك" },
  securitySettingsTitle: { en: "Security Settings", ar: "إعدادات الأمان" },
  profileInformation: { en: "Profile Information", ar: "معلومات الملف الشخصي" },
  fullName: { en: "Full Name", ar: "الاسم الكامل" },
  yourNamePlaceholder: { en: "Your Name", ar: "اسمك" },
  saveProfile: { en: "Save Profile", ar: "حفظ الملف الشخصي" },
  changePassword: { en: "Change Password", ar: "تغيير كلمة المرور" },
  enterCurrentPassword: { en: "Enter your current password", ar: "أدخل كلمة المرور الحالية" },
  enterNewPasswordHint: { en: "Enter your new password (min. 8 characters)", ar: "أدخل كلمة المرور الجديدة (8 أحرف على الأقل)" },
  confirmNewPassword: { en: "Confirm your new password", ar: "تأكيد كلمة المرور الجديدة" },
  updatePassword: { en: "Update Password", ar: "تحديث كلمة المرور" },
  twoFactorAuthDesc: { en: "Add an extra layer of security to your account", ar: "طبقة أمان إضافية لحسابك" },

  // Settings - Integrations
  thirdPartyIntegrations: { en: "Third-party Integrations", ar: "تكاملات الطرف الثالث" },
  connectExternalServices: { en: "Connect external services and tools", ar: "ربط الخدمات والأدوات الخارجية" },
  connectCrmSystemShort: { en: "Connect your CRM system", ar: "ربط نظام CRM" },
  apiAccess: { en: "API Access", ar: "الوصول إلى API" },
  manageApiKeysWebhooks: { en: "Manage API keys and webhooks", ar: "إدارة مفاتيح API والويب هوك" },
  connectButton: { en: "Connect", ar: "ربط" },
  manageButton: { en: "Manage", ar: "إدارة" },
}

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  dir: "ltr" | "rtl"
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const LANG_STORAGE_KEY = "meras-lang"

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "ar"
    return (localStorage.getItem(LANG_STORAGE_KEY) as Language) || "ar"
  })
  const dir = language === "ar" ? "rtl" : "ltr"

  // مزامنة الحالة مع اللغة المحفوظة عند أول mount (اختياري لو اتغيرت من تاب آخر)
  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = localStorage.getItem(LANG_STORAGE_KEY) as Language | null
    if (saved === "ar" || saved === "en") setLanguageState(saved)
  }, [])

  // تطبيق dir و lang على الصفحة فوراً (وراثة كل الصفحات من document)
  useEffect(() => {
    document.documentElement.dir = dir
    document.documentElement.lang = language
    document.documentElement.setAttribute("data-lang", language)
    document.body.dir = dir
  }, [language, dir])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== "undefined") localStorage.setItem(LANG_STORAGE_KEY, lang)
  }

  const t = (key: string): string => {
    return translations[key]?.[language] || key
  }

  return <I18nContext.Provider value={{ language, setLanguage, t, dir }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider")
  }
  return context
}
