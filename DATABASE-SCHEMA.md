# 🗄️ مخطط قاعدة البيانات - Meras CRM

## 📊 نظرة عامة

**قاعدة البيانات**: MySQL  
**ORM**: Prisma  
**إجمالي الجداول**: 15 جدول

---

## 🎯 الجداول الرئيسية

### 1️⃣ User (المستخدمين)

```prisma
model User {
  id            String         @id @default(uuid())
  email         String         @unique
  password      String         // ⚠️ TODO: Hash with bcrypt
  name          String
  role          UserRole       @default(AGENT)
  status        UserStatus     @default(OFFLINE)
  isActive      Boolean        @default(true)
  lastLoginAt   DateTime?
  lastLogoutAt  DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  // Relations
  conversations Conversation[]
  messages      Message[]
  logs          Log[]
  notifications Notification[]
  bookings      Booking[]
  branches      Branch[]
  whatsappAccounts WhatsAppAccount[]
  createdNotes  Note[]
}

enum UserRole {
  ADMIN       // المدير - كل الصلاحيات
  SUPERVISOR  // المشرف - مراقبة وإدارة الفريق
  AGENT       // الوكيل - الرد على المحادثات
}

enum UserStatus {
  ONLINE      // متصل الآن
  OFFLINE     // غير متصل
  AWAY        // بعيد
}
```

**الحقول المهمة**:
- `role`: يحدد صلاحيات المستخدم
- `isActive`: إذا كان `false`، لا يمكن تسجيل الدخول
- `lastLoginAt` / `lastLogoutAt`: لتتبع النشاط

---

### 2️⃣ Contact (جهات الاتصال)

```prisma
model Contact {
  id            String         @id @default(uuid())
  name          String
  phone         String         @unique  // ← رقم فريد
  email         String?
  tags          Json?          // ["vip", "customer", "prospect"]
  notes         String?        @db.Text
  followUpDate  DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  // Relations
  conversations Conversation[]
  invoices      Invoice[]
  bookings      Booking[]
  realNotes     Note[]
  
  branchId      String?
  branch        Branch?        @relation(fields: [branchId], references: [id])
}
```

**ملاحظات**:
- `phone` فريد: كل رقم يمثل عميل واحد فقط
- `tags` JSON: مصفوفة من الوسوم المرنة
- `followUpDate`: تذكير بالمتابعة

**مثال بيانات**:
```json
{
  "id": "contact-1",
  "name": "أحمد محمد",
  "phone": "966501234567",
  "email": "ahmed@example.com",
  "tags": ["vip", "premium-customer"],
  "notes": "عميل منذ 2020، يفضل التواصل صباحاً",
  "followUpDate": "2026-01-25T10:00:00.000Z"
}
```

---

### 3️⃣ Conversation (المحادثات)

```prisma
model Conversation {
  id            String              @id @default(uuid())
  contactId     String
  contact       Contact             @relation(fields: [contactId], references: [id], onDelete: Cascade)
  assignedToId  String?
  assignedTo    User?               @relation(fields: [assignedToId], references: [id])
  status        ConversationStatus  @default(ACTIVE)
  isRead        Boolean             @default(false)
  isArchived    Boolean             @default(false)
  isBlocked     Boolean             @default(false)
  lastMessageAt DateTime            @default(now())
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  
  messages      Message[]
  
  @@index([contactId])
  @@index([assignedToId])
}

enum ConversationStatus {
  ACTIVE      // نشطة (جارية)
  RESOLVED    // محلولة (تم الرد)
  PENDING     // معلقة (في انتظار)
}
```

**سير العمل**:
```
ACTIVE      → محادثة جارية، يحتاج رد
PENDING     → في انتظار معلومات من العميل
RESOLVED    → تم حل المشكلة/الاستفسار
```

**الفلترة الشائعة**:
```typescript
// محادثات غير مقروءة
where: { isRead: false }

// محادثات نشطة
where: { status: 'ACTIVE', isArchived: false }

// محادثات معينة لوكيل
where: { assignedToId: userId }
```

---

### 4️⃣ Message (الرسائل)

```prisma
model Message {
  id                 String           @id @default(uuid())
  conversationId     String
  conversation       Conversation     @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId           String?
  sender             User?            @relation(fields: [senderId], references: [id])
  whatsappAccountId  String?
  whatsappAccount    WhatsAppAccount? @relation(fields: [whatsappAccountId], references: [id])
  content            String           @db.Text
  type               MessageType      @default(TEXT)
  direction          Direction
  status             MessageStatus    @default(SENT)
  mediaUrl           String?
  createdAt          DateTime         @default(now())
  
  @@index([conversationId])
  @@index([whatsappAccountId])
}

enum MessageType {
  TEXT        // نص عادي
  IMAGE       // صورة
  VIDEO       // فيديو
  AUDIO       // صوت/بويس
  DOCUMENT    // ملف PDF أو مستند
}

enum Direction {
  INCOMING    // رسالة واردة من العميل
  OUTGOING    // رسالة صادرة من الوكيل
}

enum MessageStatus {
  SENT        // تم الإرسال
  DELIVERED   // تم التسليم
  READ        // تم القراءة
  FAILED      // فشل الإرسال
}
```

**الحقول المهمة**:
- `direction`: يحدد من أرسل الرسالة
- `whatsappAccountId`: من أي حساب WhatsApp تم الإرسال/الاستقبال
- `type`: نوع المحتوى
- `mediaUrl`: رابط الملف (للصور والفيديوهات)

**مثال بيانات**:
```json
{
  "id": "msg-1",
  "conversationId": "conv-1",
  "content": "مرحباً، أريد الاستفسار",
  "type": "TEXT",
  "direction": "INCOMING",
  "status": "DELIVERED",
  "whatsappAccountId": "acc-main-001",
  "createdAt": "2026-01-18T12:30:00.000Z"
}
```

---

### 5️⃣ Template (قوالب الرسائل)

```prisma
model Template {
  id          String           @id @default(uuid())
  name        String
  content     String           @db.Text
  category    String           // "welcome", "follow-up", "promotion"
  language    String           // "ar", "en"
  status      TemplateStatus   @default(PENDING)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}

enum TemplateStatus {
  APPROVED    // معتمد، جاهز للاستخدام
  PENDING     // قيد المراجعة
  REJECTED    // مرفوض
}
```

**أمثلة قوالب**:
```json
{
  "name": "رسالة ترحيبية",
  "content": "مرحباً {{name}}، شكراً لتواصلك مع ميراس. كيف يمكنني مساعدتك اليوم؟",
  "category": "welcome",
  "language": "ar",
  "status": "APPROVED"
}
```

---

### 6️⃣ BotFlow (سير العمل الآلي)

```prisma
model BotFlow {
  id          String      @id @default(uuid())
  name        String
  description String?     @db.Text
  trigger     String      // "new_message", "keyword", "schedule"
  steps       Json        // مصفوفة من الخطوات
  isActive    Boolean     @default(false)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}
```

**مثال Bot Flow**:
```json
{
  "name": "رد تلقائي - خارج أوقات العمل",
  "trigger": "new_message_after_hours",
  "isActive": true,
  "steps": [
    {
      "type": "send_message",
      "content": "شكراً لتواصلك. أوقات عملنا من 9 صباحاً إلى 5 مساءً. سنرد عليك في أقرب وقت."
    },
    {
      "type": "set_status",
      "status": "PENDING"
    }
  ]
}
```

---

### 7️⃣ WhatsAppAccount (حسابات واتساب)

```prisma
model WhatsAppAccount {
  id          String              @id @default(uuid())
  name        String
  phone       String              @unique
  provider    String              // "WhatsApp Web", "WhatsApp Business API"
  status      WhatsAppStatus      @default(DISCONNECTED)
  qrCode      String?             @db.Text
  sessionData Json?
  branchId    String?
  branch      Branch?             @relation(fields: [branchId], references: [id])
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  
  users       User[]
  messages    Message[]
  
  @@index([branchId])
}

enum WhatsAppStatus {
  CONNECTED      // متصل وجاهز
  DISCONNECTED   // غير متصل
  WAITING        // في انتظار QR Code
}
```

**الحقول المهمة**:
- `phone`: رقم واتساب الأعمال
- `status`: حالة الاتصال الحالية
- `qrCode`: QR Code للربط (إذا كان في حالة WAITING)
- `sessionData`: بيانات الجلسة المحفوظة

**مثال**:
```json
{
  "id": "acc-main-001",
  "name": "حساب الرياض الرئيسي",
  "phone": "966501234567",
  "provider": "WhatsApp Web",
  "status": "CONNECTED",
  "branchId": "branch-riyadh"
}
```

---

### 8️⃣ Branch (الفروع)

```prisma
model Branch {
  id               String            @id @default(uuid())
  name             String
  address          String?
  phone            String?
  email            String?
  isActive         Boolean           @default(true)
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  
  whatsappAccounts WhatsAppAccount[]
  users            User[]
  contacts         Contact[]
}
```

**الاستخدام**: للشركات متعددة الفروع

---

### 9️⃣ Booking (الحجوزات)

```prisma
model Booking {
  id            String         @id @default(uuid())
  bookingNumber String         @unique      // "BK-001"
  contactId     String
  contact       Contact        @relation(fields: [contactId], references: [id], onDelete: Cascade)
  agentId       String?
  agent         User?          @relation(fields: [agentId], references: [id])
  branch        String?
  status        BookingStatus  @default(PENDING)
  date          DateTime
  notes         String?        @db.Text
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  @@index([contactId])
  @@index([agentId])
  @@index([date])
}

enum BookingStatus {
  PENDING     // في انتظار التأكيد
  CONFIRMED   // مؤكد
  COMPLETED   // تم إنجازه
  CANCELLED   // ملغي
}
```

---

### 🔟 Invoice (الفواتير)

```prisma
model Invoice {
  id            String         @id @default(uuid())
  invoiceNumber String         @unique      // "INV-2026-001"
  contactId     String
  contact       Contact        @relation(fields: [contactId], references: [id], onDelete: Cascade)
  amount        Float
  currency      String         @default("SAR")
  status        InvoiceStatus  @default(PENDING)
  items         Json           // [{name, price, qty}, ...]
  dueDate       DateTime
  paidAt        DateTime?
  notes         String?        @db.Text
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  @@index([contactId])
  @@index([status])
}

enum InvoiceStatus {
  PENDING     // لم يتم الدفع
  PAID        // تم الدفع
  OVERDUE     // متأخر
  CANCELLED   // ملغي
}
```

**مثال items**:
```json
{
  "items": [
    { "name": "خدمة تصميم", "price": 5000, "qty": 1 },
    { "name": "استضافة سنوية", "price": 1200, "qty": 1 }
  ]
}
```

---

### 1️⃣1️⃣ Log (السجلات)

```prisma
model Log {
  id          String      @id @default(uuid())
  userId      String?
  user        User?       @relation(fields: [userId], references: [id])
  action      String      // "USER_LOGIN", "MESSAGE_SENT", "CONTACT_CREATED"
  entityType  String      // "User", "Message", "Contact"
  entityId    String?
  ipAddress   String
  userAgent   String      @db.Text
  metadata    Json?       // معلومات إضافية
  createdAt   DateTime    @default(now())
  
  @@index([userId])
  @@index([action])
  @@index([entityType])
}
```

**الاستخدام**: تتبع جميع الأنشطة في النظام

**مثال**:
```json
{
  "action": "USER_LOGIN",
  "entityType": "User",
  "entityId": "user-123",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "metadata": {
    "userName": "أحمد",
    "userRole": "AGENT"
  }
}
```

---

### 1️⃣2️⃣ Notification (الإشعارات)

```prisma
model Notification {
  id        String            @id @default(uuid())
  userId    String?
  user      User?             @relation(fields: [userId], references: [id])
  title     String
  message   String            @db.Text
  type      NotificationType  @default(INFO)
  isRead    Boolean           @default(false)
  link      String?           // رابط للانتقال إليه
  createdAt DateTime          @default(now())
  
  @@index([userId])
  @@index([isRead])
}

enum NotificationType {
  INFO        // معلومة عامة
  SUCCESS     // نجاح عملية
  WARNING     // تحذير
  ERROR       // خطأ
}
```

---

### 1️⃣3️⃣ Note (الملاحظات)

```prisma
model Note {
  id        String   @id @default(uuid())
  content   String   @db.Text
  contactId String
  contact   Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  createdBy String?
  creator   User?    @relation(fields: [createdBy], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([contactId])
  @@index([createdBy])
}
```

**الاستخدام**: ملاحظات داخلية عن العميل

---

### 1️⃣4️⃣ Settings (الإعدادات)

```prisma
model Settings {
  id                    String   @id @default(uuid())
  companyName           String?
  timezone              String   @default("UTC+03:00")
  language              String   @default("en")
  newMessagesNotif      Boolean  @default(true)
  assignmentNotif       Boolean  @default(true)
  templateNotif         Boolean  @default(false)
  dailySummaryNotif     Boolean  @default(true)
  twoFactorEnabled      Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

**ملاحظة**: جدول بسجل واحد فقط للإعدادات العامة

---

### 1️⃣5️⃣ Offer (العروض)

```prisma
model Offer {
  id             String      @id @default(uuid())
  title          String
  description    String?     @db.Text
  content        String      @db.Text
  validFrom      DateTime
  validTo        DateTime
  isActive       Boolean     @default(true)
  targetAudience Json?       // [contactIds] أو filters
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  
  @@index([isActive])
  @@index([validFrom])
  @@index([validTo])
}
```

---

## 🔗 العلاقات بين الجداول

### Diagram

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │ 1:N
       ├────────────┐
       │            │
       ▼            ▼
┌──────────┐   ┌─────────────┐
│ Message  │   │Conversation │
└──────┬───┘   └─────┬───────┘
       │             │ N:1
       │             ▼
       │        ┌─────────┐
       └───────▶│ Contact │◀──────────┐
                └─────┬───┘           │
                      │ 1:N           │ N:1
                      ├───────────────┤
                      ▼               ▼
                ┌─────────┐    ┌──────────┐
                │ Invoice │    │ Booking  │
                └─────────┘    └──────────┘

┌──────────────────┐
│ WhatsAppAccount  │
└────────┬─────────┘
         │ 1:N
         ▼
    ┌─────────┐
    │ Message │
    └─────────┘

┌────────┐
│ Branch │
└────┬───┘
     │ 1:N
     ├──────────────┬────────────┐
     ▼              ▼            ▼
┌─────────┐  ┌──────────┐  ┌──────────────────┐
│ Contact │  │   User   │  │ WhatsAppAccount  │
└─────────┘  └──────────┘  └──────────────────┘
```

---

## 📊 أمثلة استعلامات شائعة

### 1. جلب محادثات مع آخر رسالة

```typescript
const conversations = await prisma.conversation.findMany({
  include: {
    contact: true,
    assignedTo: {
      select: { id: true, name: true, email: true }
    },
    messages: {
      orderBy: { createdAt: 'desc' },
      take: 1
    }
  },
  orderBy: { lastMessageAt: 'desc' }
});
```

---

### 2. جلب رسائل محادثة محددة

```typescript
const messages = await prisma.message.findMany({
  where: { conversationId: 'conv-123' },
  include: {
    sender: {
      select: { id: true, name: true }
    }
  },
  orderBy: { createdAt: 'asc' }
});
```

---

### 3. إحصائيات يومية

```typescript
// إجمالي الرسائل اليوم
const todayMessages = await prisma.message.count({
  where: {
    createdAt: {
      gte: new Date(new Date().setHours(0, 0, 0, 0))
    }
  }
});

// المحادثات النشطة
const activeConversations = await prisma.conversation.count({
  where: {
    status: 'ACTIVE',
    isArchived: false
  }
});
```

---

### 4. البحث في جهات الاتصال

```typescript
const contacts = await prisma.contact.findMany({
  where: {
    OR: [
      { name: { contains: 'أحمد' } },
      { phone: { contains: '966' } },
      { email: { contains: '@example.com' } }
    ]
  }
});
```

---

### 5. جلب حسابات واتساب المتصلة

```typescript
const connectedAccounts = await prisma.whatsAppAccount.findMany({
  where: { status: 'CONNECTED' },
  include: {
    branch: true,
    _count: {
      select: {
        messages: true  // عدد الرسائل لكل حساب
      }
    }
  }
});
```

---

## 🔒 Indexes (الفهارس)

### لماذا الفهارس مهمة؟

```
بدون Index:
SELECT * FROM Message WHERE conversationId = 'conv-123'
→ يفحص كل سجل في الجدول 🐌 (Slow)

مع Index:
@@index([conversationId])
→ ينتقل مباشرة للسجلات المطلوبة ⚡ (Fast)
```

### الفهارس المستخدمة

```prisma
// في Message
@@index([conversationId])
@@index([whatsappAccountId])

// في Conversation
@@index([contactId])
@@index([assignedToId])

// في Booking
@@index([contactId])
@@index([agentId])
@@index([date])

// في Log
@@index([userId])
@@index([action])
@@index([entityType])

// في Notification
@@index([userId])
@@index([isRead])
```

---

## 🎯 Best Practices

### ✅ افعل

1. **استخدم Transactions للعمليات المتعددة**:
```typescript
await prisma.$transaction([
  prisma.contact.create({...}),
  prisma.conversation.create({...}),
  prisma.message.create({...})
]);
```

2. **استخدم `select` لتقليل البيانات المرجعة**:
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    email: true
    // لا نرجع password!
  }
});
```

3. **استخدم `include` بحذر**:
```typescript
// ❌ سيء (يجلب كل الرسائل!)
const conversation = await prisma.conversation.findUnique({
  where: { id: convId },
  include: { messages: true }
});

// ✅ جيد (يجلب آخر 50 رسالة فقط)
const conversation = await prisma.conversation.findUnique({
  where: { id: convId },
  include: {
    messages: {
      take: 50,
      orderBy: { createdAt: 'desc' }
    }
  }
});
```

### ❌ لا تفعل

1. لا تنسى معالجة الأخطاء:
```typescript
try {
  await prisma.contact.create({...});
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation
  }
}
```

2. لا تحذف بيانات مهمة بدون `onDelete: Cascade` أو حماية

---

## 🚀 Migrations

### إنشاء migration جديد

```bash
npx prisma migrate dev --name add_new_field
```

### تطبيق migrations على production

```bash
npx prisma migrate deploy
```

### إعادة توليد Prisma Client

```bash
npx prisma generate
```

---

**آخر تحديث: 18 يناير 2026** ✨
