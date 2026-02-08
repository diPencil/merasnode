# 📚 وثائق شاملة لـ APIs & WhatsApp Service - مشروع Meras

## 📋 جدول المحتويات

1. [نظرة عامة على البنية](#نظرة-عامة-على-البنية)
2. [Next.js API Routes (41 مسار)](#nextjs-api-routes)
3. [WhatsApp Service (خدمة منفصلة)](#whatsapp-service)
4. [التكامل بين الأنظمة](#التكامل-بين-الأنظمة)
5. [أمثلة عملية](#أمثلة-عملية)

---

## 🏗️ نظرة عامة على البنية

### البنية المعمارية

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React/Next.js)                │
│                    http://localhost:3000                     │
└────────────────────┬───────────────────────┬────────────────┘
                     │                       │
                     ▼                       ▼
        ┌─────────────────────┐   ┌──────────────────────┐
        │  Next.js API Routes │   │  WhatsApp Service    │
        │  (Backend/Server)   │   │  (Node.js/Express)   │
        │  Port: 3000         │◄──┤  Port: 3001          │
        └──────────┬──────────┘   └──────────┬───────────┘
                   │                         │
                   ▼                         ▼
        ┌─────────────────────┐   ┌──────────────────────┐
        │  MySQL Database     │   │  WhatsApp Web.js     │
        │  (via Prisma ORM)   │   │  (Puppeteer)         │
        └─────────────────────┘   └──────────────────────┘
```

### الفصل بين المسؤوليات

- **Next.js APIs**: إدارة البيانات، المصادقة، العمليات CRUD
- **WhatsApp Service**: التواصل مع WhatsApp فقط (إرسال/استقبال الرسائل)
- **Database**: تخزين جميع البيانات (المستخدمين، المحادثات، الرسائل، إلخ)

---

## 📡 Next.js API Routes

### هيكل المسارات (41 ملف API)

```
app/api/
├── auth/                      # المصادقة والأمان
│   ├── login/                ✅ تسجيل الدخول
│   ├── logout/               ✅ تسجيل الخروج
│   └── init-admin/           ✅ إنشاء أول مدير
│
├── users/                     # إدارة المستخدمين
│   ├── route.ts              ✅ GET: جلب كل المستخدمين | POST: إضافة
│   ├── [id]/route.ts         ✅ GET/PUT/DELETE مستخدم محدد
│   ├── [id]/toggle-active/   ✅ تفعيل/تعطيل حساب
│   └── agents/               ✅ جلب الوكلاء فقط
│
├── contacts/                  # جهات الاتصال
│   ├── route.ts              ✅ GET: جلب | POST: إضافة
│   ├── [id]/route.ts         ✅ GET/PUT/DELETE جهة اتصال
│   └── [id]/notes/           ✅ إدارة ملاحظات جهة الاتصال
│
├── conversations/             # المحادثات
│   ├── route.ts              ✅ GET: جلب المحادثات | POST: إنشاء
│   ├── [id]/route.ts         ✅ GET/PUT/DELETE محادثة
│   └── [id]/assign/          ✅ تعيين محادثة لمستخدم
│
├── messages/                  # الرسائل
│   └── route.ts              ✅ GET: جلب رسائل محادثة | POST: إرسال
│
├── templates/                 # قوالب الرسائل
│   └── route.ts              ✅ GET: جلب القوالب | POST: إضافة قالب
│
├── bot-flows/                 # سير العمل الآلي
│   └── route.ts              ✅ GET: جلب | POST: إضافة
│
├── bookings/                  # الحجوزات
│   ├── route.ts              ✅ GET: جلب | POST: إضافة
│   └── [id]/route.ts         ✅ GET/PUT/DELETE حجز
│
├── invoices/                  # الفواتير
│   ├── route.ts              ✅ GET: جلب | POST: إنشاء فاتورة
│   └── [id]/route.ts         ✅ GET/PUT/DELETE فاتورة
│
├── offers/                    # العروض
│   ├── route.ts              ✅ GET: جلب | POST: إضافة عرض
│   └── [id]/route.ts         ✅ GET/PUT/DELETE عرض
│
├── branches/                  # الفروع
│   ├── route.ts              ✅ GET: جلب | POST: إضافة فرع
│   └── [id]/route.ts         ✅ GET/PUT/DELETE فرع
│
├── whatsapp/                  # تكامل WhatsApp
│   ├── route.ts              ✅ معلومات عامة
│   ├── send/                 ✅ إرسال رسالة WhatsApp
│   ├── status/               ✅ تحديث حالة الحساب
│   ├── webhook/              ✅ استقبال رسائل واردة
│   ├── accounts/             ✅ إدارة حسابات WhatsApp
│   └── auth/                 ✅ مصادقة WhatsApp
│
├── dashboard/                 # الإحصائيات
│   └── stats/                ✅ إحصائيات لوحة التحكم
│
├── logs/                      # السجلات
│   ├── route.ts              ✅ GET: جلب السجلات
│   └── create/               ✅ POST: إنشاء سجل
│
├── notifications/             # الإشعارات
│   ├── route.ts              ✅ GET: جلب | POST: إضافة
│   ├── [id]/route.ts         ✅ PUT: تحديث (قراءة)
│   ├── create-for-admins/    ✅ إنشاء للمدراء
│   └── send-to-admins/       ✅ إرسال للمدراء
│
├── settings/                  # الإعدادات
│   └── route.ts              ✅ GET/PUT إعدادات النظام
│
├── integrations/              # التكاملات الخارجية
│   ├── api-keys/             ✅ إدارة مفاتيح API
│   └── crm/                  ✅ تكامل CRM خارجي
│
├── profile/                   # الملف الشخصي
│   └── route.ts              ✅ GET/PUT ملف المستخدم
│
├── security/                  # الأمان
│   └── password/             ✅ تغيير كلمة المرور
│
└── upload/                    # رفع الملفات
    └── route.ts              ✅ رفع الصور والملفات
```

---

## 🔑 شرح تفصيلي للـ APIs الرئيسية

### 1️⃣ **Authentication APIs** (`/api/auth/*`)

#### 🔐 `POST /api/auth/login` - تسجيل الدخول

**الوصف**: يسجل دخول المستخدم ويرجع بياناته مع token

**Request Body**:
```json
{
  "email": "admin@meras.com",
  "password": "admin123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-123",
      "name": "Admin User",
      "email": "admin@meras.com",
      "role": "ADMIN",
      "status": "ONLINE",
      "isActive": true
    },
    "token": "temporary-token-uuid-123"
  }
}
```

**الوظائف الإضافية**:
- ✅ تحديث حالة المستخدم إلى `ONLINE`
- ✅ تسجيل وقت تسجيل الدخول `lastLoginAt`
- ✅ إنشاء إشعار للمستخدم
- ✅ إشعار جميع المدراء بتسجيل دخول المستخدم (إذا لم يكن مدير)
- ✅ تسجيل النشاط في جدول `Log`
- ✅ كتابة سجل Debug في ملف `debug.log`

**التحقق من الصحة**:
- ❌ إذا كان الحساب غير نشط (`isActive = false`)
- ❌ إذا كانت كلمة المرور خاطئة
- ⚠️ **ملاحظة**: حالياً كلمات المرور غير مشفرة (TODO: استخدام bcrypt)

---

#### 🚪 `POST /api/auth/logout` - تسجيل الخروج

**الوصف**: يسجل خروج المستخدم ويحدث حالته

**Request Body**:
```json
{
  "userId": "uuid-123"
}
```

**الوظائف**:
- ✅ تحديث حالة المستخدم إلى `OFFLINE`
- ✅ تسجيل وقت الخروج `lastLogoutAt`

---

### 2️⃣ **Contacts APIs** (`/api/contacts/*`)

#### 👥 `GET /api/contacts` - جلب جميع جهات الاتصال

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "أحمد محمد",
      "phone": "966501234567",
      "email": "ahmed@example.com",
      "tags": ["vip", "customer"],
      "notes": "عميل مهم",
      "followUpDate": "2026-01-25T00:00:00.000Z",
      "createdAt": "2026-01-15T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

#### ➕ `POST /api/contacts` - إضافة جهة اتصال جديدة

**Request Body**:
```json
{
  "name": "سارة علي",
  "phone": "966509876543",
  "email": "sara@example.com",
  "tags": ["prospect"],
  "notes": "تواصل معها الأسبوع القادم",
  "followUpDate": "2026-01-30"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-2",
    "name": "سارة علي",
    "phone": "966509876543",
    "email": "sara@example.com",
    "tags": ["prospect"],
    "notes": "تواصل معها الأسبوع القادم",
    "followUpDate": "2026-01-30T00:00:00.000Z",
    "createdAt": "2026-01-18T12:00:00.000Z"
  }
}
```

**الوظائف الإضافية**:
- ✅ تسجيل النشاط في `Log` باستخدام `logActivity()`
- ❌ خطأ إذا كان رقم الهاتف موجود مسبقاً (Unique Constraint)

---

#### 📝 `GET /api/contacts/[id]` - جلب جهة اتصال محددة

**URL**: `/api/contacts/uuid-1`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "name": "أحمد محمد",
    "phone": "966501234567",
    "email": "ahmed@example.com",
    "conversations": [...],
    "invoices": [...],
    "bookings": [...]
  }
}
```

---

#### 📌 `POST /api/contacts/[id]/notes` - إضافة ملاحظة لجهة اتصال

**URL**: `/api/contacts/uuid-1/notes`

**Request Body**:
```json
{
  "content": "تم التواصل معه اليوم، يريد عرض سعر",
  "createdBy": "user-uuid"
}
```

---

### 3️⃣ **Conversations APIs** (`/api/conversations/*`)

#### 💬 `GET /api/conversations` - جلب المحادثات

**Query Parameters**:
- `status`: `ACTIVE` | `RESOLVED` | `PENDING`
- `archived`: `true` | `false`
- `read`: `true` | `false`

**Example**: `/api/conversations?status=ACTIVE&read=false`

**Response**:
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv-1",
      "status": "ACTIVE",
      "isRead": false,
      "isArchived": false,
      "lastMessageAt": "2026-01-18T12:30:00.000Z",
      "contact": {
        "id": "contact-1",
        "name": "أحمد محمد",
        "phone": "966501234567"
      },
      "assignedTo": {
        "id": "user-1",
        "name": "محمد العامل",
        "email": "agent@meras.com"
      },
      "messages": [
        {
          "id": "msg-1",
          "content": "مرحباً، أريد الاستفسار",
          "direction": "INCOMING",
          "createdAt": "2026-01-18T12:30:00.000Z"
        }
      ]
    }
  ],
  "count": 1
}
```

---

#### 📌 `POST /api/conversations/[id]/assign` - تعيين محادثة لمستخدم

**URL**: `/api/conversations/conv-1/assign`

**Request Body**:
```json
{
  "userId": "user-2"
}
```

**الوظيفة**: تعيين محادثة لوكيل محدد للرد عليها

---

### 4️⃣ **Messages APIs** (`/api/messages`)

#### 💌 `GET /api/messages?conversationId=conv-1` - جلب رسائل محادثة

**Response**:
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg-1",
      "content": "مرحباً",
      "type": "TEXT",
      "direction": "INCOMING",
      "status": "DELIVERED",
      "createdAt": "2026-01-18T12:00:00.000Z",
      "sender": null
    },
    {
      "id": "msg-2",
      "content": "أهلاً وسهلاً، كيف يمكنني مساعدتك؟",
      "type": "TEXT",
      "direction": "OUTGOING",
      "status": "SENT",
      "createdAt": "2026-01-18T12:01:00.000Z",
      "sender": {
        "id": "user-1",
        "name": "محمد العامل",
        "email": "agent@meras.com"
      }
    }
  ],
  "count": 2
}
```

---

#### 📤 `POST /api/messages` - إرسال رسالة جديدة

**Request Body**:
```json
{
  "conversationId": "conv-1",
  "content": "شكراً لتواصلك",
  "direction": "OUTGOING",
  "accountId": "whatsapp-account-1",
  "mediaUrl": null
}
```

**سير العمل** (Workflow):

```
1. جلب بيانات المحادثة والعميل
        ↓
2. إرسال إلى WhatsApp Service (فقط إذا OUTGOING)
   POST http://localhost:3001/send
   {
     "accountId": "whatsapp-account-1",
     "phoneNumber": "966501234567",
     "message": "شكراً لتواصلك"
   }
        ↓
3. حفظ الرسالة في قاعدة البيانات
        ↓
4. تحديث lastMessageAt للمحادثة
        ↓
5. تسجيل النشاط
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "msg-3",
    "conversationId": "conv-1",
    "content": "شكراً لتواصلك",
    "direction": "OUTGOING",
    "status": "SENT",
    "createdAt": "2026-01-18T12:05:00.000Z"
  }
}
```

---

### 5️⃣ **WhatsApp APIs** (`/api/whatsapp/*`)

#### 📱 `POST /api/whatsapp/send` - إرسال رسالة واتساب

**الوصف**: يرسل طلب إلى WhatsApp Service لإرسال رسالة

**Request Body**:
```json
{
  "phoneNumber": "966501234567",
  "message": "مرحباً بك في ميراس"
}
```

**الكود الداخلي**:
```typescript
// app/api/whatsapp/send/route.ts
const response = await fetch('http://localhost:3001/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})
```

**Response**:
```json
{
  "success": true,
  "chatId": "966501234567@c.us"
}
```

---

#### 🔔 `POST /api/whatsapp/webhook` - استقبال رسائل واردة

**الوصف**: يستقبل الرسائل من WhatsApp Service ويحفظها في قاعدة البيانات

**Request Body** (من WhatsApp Service):
```json
{
  "accountId": "whatsapp-account-1",
  "from": "966501234567@c.us",
  "body": "مرحباً، أريد الاستفسار",
  "timestamp": 1705583400,
  "isGroup": false,
  "senderName": "أحمد محمد",
  "senderId": "966501234567@c.us",
  "hasMedia": false,
  "type": "chat"
}
```

**سير العمل**:

```
1. استخراج رقم الهاتف من "from"
        ↓
2. البحث عن Contact أو إنشاء واحد جديد
        ↓
3. البحث عن Conversation أو إنشاء واحدة جديدة
        ↓
4. إعادة تفعيل المحادثة إذا كانت RESOLVED
        ↓
5. إنشاء Message بـ direction: INCOMING
        ↓
6. تحديث lastMessageAt و isRead: false
```

**Response**:
```json
{
  "success": true,
  "message": "Message saved successfully",
  "data": {
    "contactId": "contact-1",
    "conversationId": "conv-1",
    "messageId": "msg-4"
  }
}
```

---

#### ⚙️ `POST /api/whatsapp/status` - تحديث حالة حساب واتساب

**الوصف**: يستقبل تحديثات الحالة من WhatsApp Service

**Request Body**:
```json
{
  "phone": "966501111111",
  "status": "CONNECTED",
  "name": "My Business Account"
}
```

**الحالات الممكنة**:
- `CONNECTED`: متصل وجاهز
- `DISCONNECTED`: غير متصل
- `WAITING`: في انتظار QR Code

**الوظيفة**:
- ✅ يحدث جدول `WhatsAppAccount`
- ✅ إذا لم يجد الحساب وكان `CONNECTED`، ينشئ حساب جديد

---

### 6️⃣ **Dashboard Stats API** (`/api/dashboard/stats`)

#### 📊 `GET /api/dashboard/stats` - إحصائيات لوحة التحكم

**Response**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalMessages": 1250,
      "totalConversations": 87,
      "activeContacts": 42,
      "avgResponseTime": "2.5m"
    },
    "charts": {
      "messagesByDay": [
        { "day": "Mon", "incoming": 45, "outgoing": 52 },
        { "day": "Tue", "incoming": 38, "outgoing": 41 },
        { "day": "Wed", "incoming": 52, "outgoing": 48 }
      ],
      "messageTypes": [
        { "name": "Text", "value": 1100, "color": "hsl(var(--chart-1))" },
        { "name": "Image", "value": 120, "color": "hsl(var(--chart-4))" },
        { "name": "Document", "value": 30, "color": "hsl(var(--chart-5))" }
      ]
    },
    "recentConversations": [...],
    "whatsappAccounts": [
      {
        "id": "acc-1",
        "name": "Main Account",
        "phone": "966501111111",
        "status": "CONNECTED",
        "branch": "Riyadh Branch"
      }
    ],
    "teamPerformance": [
      {
        "name": "Response Rate",
        "current": 95,
        "target": 100,
        "percentage": 95
      }
    ]
  }
}
```

**الاستعلامات المستخدمة**:
- ✅ إجمالي الرسائل والمحادثات
- ✅ جهات الاتصال النشطة (آخر 7 أيام)
- ✅ متوسط وقت الاستجابة (MySQL `TIMESTAMPDIFF`)
- ✅ رسائل حسب اليوم (آخر 7 أيام)
- ✅ توزيع أنواع الرسائل
- ✅ آخر 10 محادثات

---

### 7️⃣ **Templates, Bot Flows, Bookings, etc.**

#### 📋 جميع الـ APIs تتبع نفس النمط:

**GET**: جلب البيانات مع إمكانية الفلترة
**POST**: إضافة عنصر جديد
**PUT/PATCH**: تعديل عنصر موجود
**DELETE**: حذف عنصر

**مثال - Templates**:
- `GET /api/templates` → جلب جميع القوالب
- `GET /api/templates?category=welcome` → فلترة حسب الفئة
- `POST /api/templates` → إضافة قالب جديد

---

## 🤖 WhatsApp Service (خدمة منفصلة)

### البنية والهدف

```
whatsapp-service/
├── server-multi.js              # الخادم الرئيسي (Express)
├── multi-client-manager.js      # مدير الحسابات المتعددة
├── server.js                    # خادم لحساب واحد (قديم)
└── package.json                 # التبعيات
```

### التبعيات الرئيسية

```json
{
  "express": "^4.18.2",           // Web Framework
  "cors": "^2.8.5",               // السماح بطلبات Cross-Origin
  "whatsapp-web.js": "^1.34.2",   // مكتبة WhatsApp Web
  "qrcode": "^1.5.3",             // توليد QR Codes
  "node-fetch": "^2.7.0"          // HTTP Requests
}
```

---

### 🎯 الـ Endpoints المتاحة

#### ✅ Port: `3001`

```
http://localhost:3001/

├── GET  /health                       # فحص صحة الخدمة
├── GET  /status                       # حالة جميع الحسابات
├── GET  /status/:accountId            # حالة حساب محدد + QR Code
├── POST /initialize/:accountId        # تهيئة حساب واتساب
├── POST /send                         # إرسال رسالة
├── POST /disconnect/:accountId        # فصل حساب
└── GET  /chats/:accountId            # جلب محادثات حساب
```

---

### 🔑 شرح تفصيلي لكل Endpoint

#### 1️⃣ `GET /health` - فحص صحة الخدمة

**Response**:
```json
{
  "success": true,
  "service": "whatsapp-multi-service",
  "totalAccounts": 3,
  "readyAccounts": 2,
  "accounts": [
    {
      "accountId": "acc-1",
      "isReady": true,
      "status": "CONNECTED",
      "phone": "966501111111",
      "hasQrCode": false
    },
    {
      "accountId": "acc-2",
      "isReady": false,
      "status": "QR_GENERATED",
      "phone": null,
      "hasQrCode": true
    }
  ]
}
```

---

#### 2️⃣ `POST /initialize/:accountId` - تهيئة حساب واتساب

**URL**: `POST http://localhost:3001/initialize/acc-main-001`

**Request Body**:
```json
{
  "phone": "966501111111",
  "force": false
}
```

**Parameters**:
- `accountId`: معرف فريد للحساب (يُستخدم كـ session ID)
- `phone`: رقم الهاتف (اختياري، للمرجعية فقط)
- `force`: إذا كان `true`، يحذف الجلسة ويعيد المصادقة

**سير العمل**:

```
1. إنشاء WhatsApp Client جديد
   - LocalAuth مع clientId فريد
   - Puppeteer headless mode
        ↓
2. إعداد Event Handlers:
   - on('qr'): توليد QR Code
   - on('ready'): الحساب جاهز
   - on('authenticated'): تم المصادقة
   - on('disconnected'): انقطع الاتصال
   - on('message'): استقبال رسالة
        ↓
3. تهيئة العميل (client.initialize())
        ↓
4. حفظ في Map: clients.set(accountId, clientData)
```

**Response**:
```json
{
  "success": true,
  "message": "Account acc-main-001 initialization started",
  "status": "INITIALIZING"
}
```

**ملاحظات مهمة**:
- ✅ كل حساب له جلسة منفصلة تماماً
- ✅ يمكن تشغيل أكثر من حساب في نفس الوقت
- ⚠️ إذا لم يتم مسح QR Code خلال دقيقة، يُنشأ QR جديد

---

#### 3️⃣ `GET /status/:accountId` - الحصول على حالة حساب + QR Code

**URL**: `GET http://localhost:3001/status/acc-main-001`

**Response (QR Code جاهز)**:
```json
{
  "success": true,
  "accountId": "acc-main-001",
  "isReady": false,
  "status": "QR_GENERATED",
  "phone": null,
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS..."
}
```

**Response (متصل)**:
```json
{
  "success": true,
  "accountId": "acc-main-001",
  "isReady": true,
  "status": "CONNECTED",
  "phone": "966501111111",
  "qrCode": null
}
```

**الاستخدام**: يُستخدم لعرض QR Code في الواجهة الأمامية

---

#### 4️⃣ `POST /send` - إرسال رسالة

**Request Body**:
```json
{
  "accountId": "acc-main-001",
  "phoneNumber": "966501234567",
  "message": "مرحباً بك في ميراس",
  "mediaUrl": null,
  "chatId": null
}
```

**Parameters**:
- `accountId`: **مطلوب** - من أي حساب سنرسل
- `phoneNumber`: رقم المستلم
- `message`: نص الرسالة
- `mediaUrl`: رابط صورة/فيديو (اختياري)
- `chatId`: معرف المحادثة (اختياري، بديل للـ phoneNumber)

**سير العمل**:

```
1. التحقق من وجود الحساب
        ↓
2. التحقق من جاهزية الحساب (isReady = true)
        ↓
3. تنسيق رقم الهاتف → "966501234567@c.us"
        ↓
4. إرسال الرسالة عبر WhatsApp Web.js:
   - إذا كان mediaUrl موجود → MessageMedia.fromUrl()
   - وإلا → client.sendMessage(chatId, message)
        ↓
5. إرجاع chatId للمرجعية
```

**Response**:
```json
{
  "success": true,
  "chatId": "966501234567@c.us"
}
```

**Errors**:
```json
{
  "success": false,
  "error": "Account acc-main-001 is not ready. Status: QR_GENERATED"
}
```

---

#### 5️⃣ Event Handlers (معالجات الأحداث)

##### 📱 `on('qr')` - توليد QR Code

```javascript
client.on('qr', (qr) => {
  console.log(`📱 QR Code generated for ${accountId}`);
  clientData.qrCode = qr;
  clientData.status = 'QR_GENERATED';
  
  // إرسال إلى Next.js API
  fetch(`${NEXT_APP_URL}/api/whatsapp/status`, {
    method: 'POST',
    body: JSON.stringify({
      accountId,
      status: 'WAITING',
      qrCode: qr
    })
  });
});
```

---

##### ✅ `on('ready')` - الحساب جاهز

```javascript
client.on('ready', async () => {
  console.log(`✅ Client ${accountId} is ready!`);
  clientData.isReady = true;
  clientData.status = 'CONNECTED';
  clientData.connectedPhone = client.info.wid.user;
  
  // تحديث قاعدة البيانات
  await fetch(`${NEXT_APP_URL}/api/whatsapp/status`, {
    method: 'POST',
    body: JSON.stringify({
      accountId,
      status: 'CONNECTED',
      phone: clientData.connectedPhone
    })
  });
});
```

---

##### 📨 `on('message')` - استقبال رسالة

**هذا هو القلب النابض للنظام!**

```javascript
client.on('message', async (message) => {
  const chat = await message.getChat();
  const contact = await message.getContact();
  
  const payload = {
    accountId,                              // أي حساب استقبل الرسالة
    from: message.from,                     // "966501234567@c.us"
    body: message.body,                     // "مرحباً"
    timestamp: message.timestamp,           // 1705583400
    isGroup: chat.isGroup,                  // false
    senderName: contact.pushname || contact.name,  // "أحمد"
    senderId: message.author || message.from,
    hasMedia: message.hasMedia,             // false
    type: message.type                      // "chat"
  };
  
  // إرسال إلى Next.js Webhook
  await fetch(`${NEXT_APP_URL}/api/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
});
```

**الـ Webhook في Next.js** (`/api/whatsapp/webhook`) يستقبل هذه البيانات ويقوم بـ:
1. إنشاء/تحديث Contact
2. إنشاء/تحديث Conversation
3. إنشاء Message جديدة
4. إشعار المستخدمين

---

### 🧩 MultiClientManager Class

**الغرض**: إدارة عدة حسابات واتساب في نفس الوقت

```javascript
class MultiClientManager extends EventEmitter {
  constructor(nextAppUrl) {
    this.clients = new Map();  // accountId → clientData
    this.nextAppUrl = nextAppUrl;
  }
  
  // Methods:
  async initializeClient(accountId, phone)
  async sendMessage(accountId, phoneNumber, message, mediaUrl, chatId)
  getClientStatus(accountId)
  getAllClientsStatus()
  async disconnectClient(accountId)
  async restartClient(accountId)
  async getChats(accountId)
  async shutdownAll()
}
```

**البنية الداخلية**:

```javascript
clients: Map {
  "acc-main-001" => {
    client: Client {...},           // WhatsApp Client Instance
    accountId: "acc-main-001",
    phone: "966501111111",
    isReady: true,
    qrCode: null,
    status: "CONNECTED",
    connectedPhone: "966501111111"
  },
  "acc-main-002" => {
    client: Client {...},
    accountId: "acc-main-002",
    phone: "966502222222",
    isReady: false,
    qrCode: "qr-string-here",
    status: "QR_GENERATED",
    connectedPhone: null
  }
}
```

---

## 🔗 التكامل بين الأنظمة

### سيناريو كامل: إرسال واستقبال رسالة

#### 📤 **السيناريو 1: المستخدم يرسل رسالة من Dashboard**

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────┐
│   Frontend   │       │  Next.js API │       │  WhatsApp    │       │ WhatsApp │
│    React     │       │   (Server)   │       │   Service    │       │   Web    │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘       └────┬─────┘
       │                      │                       │                    │
       │ 1. POST /api/messages│                       │                    │
       │ {conversationId,     │                       │                    │
       │  content,            │                       │                    │
       │  accountId}          │                       │                    │
       ├─────────────────────>│                       │                    │
       │                      │                       │                    │
       │                      │ 2. POST /send         │                    │
       │                      │ {accountId,           │                    │
       │                      │  phoneNumber,         │                    │
       │                      │  message}             │                    │
       │                      ├──────────────────────>│                    │
       │                      │                       │                    │
       │                      │                       │ 3. sendMessage()   │
       │                      │                       ├───────────────────>│
       │                      │                       │                    │
       │                      │                       │ 4. ✅ Sent         │
       │                      │                       │<───────────────────┤
       │                      │                       │                    │
       │                      │ 5. {success: true}    │                    │
       │                      │<──────────────────────┤                    │
       │                      │                       │                    │
       │                      │ 6. Save to DB         │                    │
       │                      │ - Message             │                    │
       │                      │ - Update Conversation │                    │
       │                      │                       │                    │
       │ 7. {success, data}   │                       │                    │
       │<─────────────────────┤                       │                    │
       │                      │                       │                    │
```

---

#### 📥 **السيناريو 2: عميل يرسل رسالة من WhatsApp**

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ WhatsApp │       │  WhatsApp    │       │  Next.js API │       │   Database   │
│   User   │       │   Service    │       │   (Server)   │       │    MySQL     │
└────┬─────┘       └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
     │                    │                       │                      │
     │ 1. Send Message    │                       │                      │
     ├───────────────────>│                       │                      │
     │                    │                       │                      │
     │                    │ 2. on('message')      │                      │
     │                    │ Event Triggered       │                      │
     │                    │                       │                      │
     │                    │ 3. POST /webhook      │                      │
     │                    │ {accountId, from,     │                      │
     │                    │  body, senderName}    │                      │
     │                    ├──────────────────────>│                      │
     │                    │                       │                      │
     │                    │                       │ 4. Find/Create       │
     │                    │                       │    Contact           │
     │                    │                       ├─────────────────────>│
     │                    │                       │                      │
     │                    │                       │ 5. Find/Create       │
     │                    │                       │    Conversation      │
     │                    │                       ├─────────────────────>│
     │                    │                       │                      │
     │                    │                       │ 6. Create Message    │
     │                    │                       │    (INCOMING)        │
     │                    │                       ├─────────────────────>│
     │                    │                       │                      │
     │                    │                       │ 7. Update            │
     │                    │                       │    Conversation      │
     │                    │                       │    (lastMessageAt,   │
     │                    │                       │     isRead: false)   │
     │                    │                       ├─────────────────────>│
     │                    │                       │                      │
     │                    │ 8. {success: true}    │                      │
     │                    │<──────────────────────┤                      │
     │                    │                       │                      │
```

---

### سيناريو 3: ربط حساب واتساب جديد

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────┐
│   Frontend   │       │  Next.js API │       │  WhatsApp    │       │    DB    │
│   (Admin)    │       │              │       │   Service    │       │          │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘       └────┬─────┘
       │                      │                       │                    │
       │ 1. Click "Add Account"                      │                    │
       │                      │                       │                    │
       │ 2. POST /initialize/acc-123                 │                    │
       ├──────────────────────┼──────────────────────>│                    │
       │                      │                       │                    │
       │                      │                       │ 3. Create Client   │
       │                      │                       │    with LocalAuth  │
       │                      │                       │    (session: acc-123)
       │                      │                       │                    │
       │                      │                       │ 4. Initialize()    │
       │                      │                       │    Loading...      │
       │                      │                       │                    │
       │                      │                       │ 5. on('qr')        │
       │                      │                       │    QR Generated    │
       │                      │                       │                    │
       │                      │  6. POST /status      │                    │
       │                      │  {status: WAITING,    │                    │
       │                      │   qrCode}             │                    │
       │                      │<──────────────────────┤                    │
       │                      │                       │                    │
       │                      │ 7. Update DB          │                    │
       │                      ├───────────────────────┼───────────────────>│
       │                      │                       │                    │
       │ 8. Poll /status/acc-123                     │                    │
       ├──────────────────────┼──────────────────────>│                    │
       │                      │                       │                    │
       │ 9. {qrCode: "data:image/png..."}            │                    │
       │<─────────────────────┼───────────────────────┤                    │
       │                      │                       │                    │
       │ 10. Display QR Code  │                       │                    │
       │     in Modal         │                       │                    │
       │                      │                       │                    │
       │ 11. User Scans QR    │                       │                    │
       │     with Phone       │                       │                    │
       │                      │                       │                    │
       │                      │                       │ 12. on('authenticated')
       │                      │                       │                    │
       │                      │                       │ 13. on('ready')    │
       │                      │                       │     ✅ Connected!  │
       │                      │                       │                    │
       │                      │  14. POST /status     │                    │
       │                      │  {status: CONNECTED,  │                    │
       │                      │   phone: "9665011..."}│                    │
       │                      │<──────────────────────┤                    │
       │                      │                       │                    │
       │                      │ 15. Update DB         │                    │
       │                      ├───────────────────────┼───────────────────>│
       │                      │                       │                    │
       │ 16. Poll shows       │                       │                    │
       │     status: CONNECTED│                       │                    │
       │<─────────────────────┤                       │                    │
       │                      │                       │                    │
       │ 17. Hide Modal       │                       │                    │
       │     Show ✅ Connected│                       │                    │
       │                      │                       │                    │
```

---

## 🔒 الأمان والاعتبارات

### ⚠️ نقاط الضعف الحالية (يجب معالجتها)

1. **كلمات المرور غير مشفرة**
   ```typescript
   // ❌ حالياً
   if (user.password !== body.password)
   
   // ✅ يجب أن يكون
   import bcrypt from 'bcryptjs'
   const isValid = await bcrypt.compare(body.password, user.password)
   ```

2. **لا يوجد JWT Tokens**
   ```typescript
   // ❌ حالياً
   token: "temporary-token-" + user.id
   
   // ✅ يجب أن يكون
   import jwt from 'jsonwebtoken'
   const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '7d' })
   ```

3. **لا يوجد Rate Limiting**
   - يمكن للمهاجم محاولة تسجيل دخول غير محدودة
   - **الحل**: استخدام `express-rate-limit`

4. **CORS مفتوح بالكامل**
   ```javascript
   // ❌ حالياً
   app.use(cors())
   
   // ✅ يجب أن يكون
   app.use(cors({
     origin: 'http://localhost:3000',
     credentials: true
   }))
   ```

---

### ✅ الممارسات الجيدة الموجودة

1. **فصل الاهتمامات** (Separation of Concerns)
   - WhatsApp Service منفصل عن Next.js
   - APIs منظمة حسب الموارد

2. **Prisma ORM**
   - حماية من SQL Injection
   - Type Safety

3. **Activity Logging**
   - تتبع جميع الأنشطة المهمة
   - سهولة التدقيق (Auditing)

4. **Graceful Shutdown**
   ```javascript
   process.on('SIGINT', async () => {
     await manager.shutdownAll()
     process.exit(0)
   })
   ```

---

## 🎯 أمثلة عملية

### مثال 1: إنشاء جهة اتصال وإرسال رسالة

```bash
# 1. إنشاء جهة اتصال
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "عمر خالد",
    "phone": "966503334444",
    "email": "omar@example.com",
    "tags": ["new-customer"]
  }'

# Response: { "success": true, "data": { "id": "contact-123", ... } }

# 2. إنشاء محادثة
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "contact-123"
  }'

# Response: { "success": true, "data": { "id": "conv-456", ... } }

# 3. إرسال رسالة
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv-456",
    "content": "مرحباً عمر، كيف يمكننا مساعدتك؟",
    "direction": "OUTGOING",
    "accountId": "acc-main-001"
  }'

# Response: { "success": true, "data": { "id": "msg-789", ... } }
```

---

### مثال 2: الحصول على إحصائيات Dashboard

```javascript
// في الـ Frontend
async function fetchDashboardStats() {
  const response = await fetch('http://localhost:3000/api/dashboard/stats')
  const data = await response.json()
  
  console.log(`إجمالي الرسائل: ${data.data.stats.totalMessages}`)
  console.log(`جهات الاتصال النشطة: ${data.data.stats.activeContacts}`)
  console.log(`متوسط وقت الاستجابة: ${data.data.stats.avgResponseTime}`)
  
  // عرض الرسوم البيانية
  data.data.charts.messagesByDay.forEach(day => {
    console.log(`${day.day}: ${day.incoming} واردة، ${day.outgoing} صادرة`)
  })
}
```

---

### مثال 3: تهيئة حساب WhatsApp جديد

```javascript
// في الـ Frontend (Admin Panel)
async function initializeWhatsAppAccount(accountId, phone) {
  // 1. طلب التهيئة
  const initRes = await fetch(`http://localhost:3001/initialize/${accountId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, force: false })
  })
  
  // 2. Poll للحصول على QR Code
  const pollInterval = setInterval(async () => {
    const statusRes = await fetch(`http://localhost:3001/status/${accountId}`)
    const status = await statusRes.json()
    
    if (status.qrCode) {
      // عرض QR Code للمستخدم
      displayQRCode(status.qrCode)
    }
    
    if (status.isReady) {
      // الحساب متصل!
      clearInterval(pollInterval)
      showSuccess(`الحساب ${status.phone} متصل الآن!`)
    }
  }, 2000)
}
```

---

## 📝 الخلاصة

### النقاط الرئيسية

1. **Next.js APIs (41 مسار)**:
   - إدارة البيانات والعمليات CRUD
   - المصادقة والتفويض
   - الإحصائيات والتقارير

2. **WhatsApp Service (خدمة منفصلة)**:
   - إرسال واستقبال رسائل WhatsApp
   - إدارة حسابات متعددة
   - توليد QR Codes

3. **التكامل**:
   - Next.js يطلب من WhatsApp Service إرسال رسائل
   - WhatsApp Service يرسل الرسائل الواردة إلى Next.js Webhook
   - قاعدة البيانات تُحدَّث من الجانبين

### البنية القوية

✅ **Microservices Architecture**: فصل واضح بين الخدمات
✅ **Event-Driven**: استخدام Events للتواصل بين المكونات
✅ **Scalable**: يمكن توسيع كل خدمة بشكل مستقل
✅ **Type-Safe**: TypeScript في Next.js + Prisma ORM

### التحسينات المطلوبة

⚠️ تشفير كلمات المرور (bcrypt)
⚠️ JWT Tokens للمصادقة
⚠️ Rate Limiting
⚠️ WebSocket للـ Real-time Updates
⚠️ Queue System (Redis) للرسائل

---

**تم بحمد الله ✨**

*آخر تحديث: 18 يناير 2026*
