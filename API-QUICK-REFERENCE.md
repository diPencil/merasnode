# 🚀 مرجع سريع - APIs & WhatsApp Service

## 📡 Next.js API Routes (Port 3000)

### 🔐 Authentication
```bash
POST /api/auth/login        # تسجيل دخول
POST /api/auth/logout       # تسجيل خروج
```

### 👥 Contacts
```bash
GET    /api/contacts              # جلب جميع جهات الاتصال
POST   /api/contacts              # إضافة جهة اتصال
GET    /api/contacts/[id]         # جلب جهة اتصال محددة
PUT    /api/contacts/[id]         # تعديل
DELETE /api/contacts/[id]         # حذف
POST   /api/contacts/[id]/notes   # إضافة ملاحظة
```

### 💬 Conversations
```bash
GET  /api/conversations                     # جلب المحادثات
POST /api/conversations                     # إنشاء محادثة
GET  /api/conversations/[id]                # جلب محادثة محددة
POST /api/conversations/[id]/assign         # تعيين لمستخدم
```

### 📨 Messages
```bash
GET  /api/messages?conversationId=xxx    # جلب رسائل محادثة
POST /api/messages                       # إرسال رسالة
```

### 📱 WhatsApp
```bash
POST /api/whatsapp/send        # إرسال رسالة WhatsApp
POST /api/whatsapp/webhook     # استقبال رسائل واردة
POST /api/whatsapp/status      # تحديث حالة حساب
GET  /api/whatsapp/accounts    # جلب حسابات WhatsApp
```

### 📊 Dashboard
```bash
GET /api/dashboard/stats       # إحصائيات لوحة التحكم
```

### 👨‍💼 Users
```bash
GET    /api/users           # جلب المستخدمين
POST   /api/users           # إضافة مستخدم
GET    /api/users/[id]      # جلب مستخدم محدد
PUT    /api/users/[id]      # تعديل
DELETE /api/users/[id]      # حذف
```

### 📝 Templates
```bash
GET  /api/templates         # جلب القوالب
POST /api/templates         # إضافة قالب
```

### 🤖 Bot Flows
```bash
GET  /api/bot-flows         # جلب سير العمل الآلي
POST /api/bot-flows         # إضافة سير عمل
```

### 📅 Bookings
```bash
GET    /api/bookings        # جلب الحجوزات
POST   /api/bookings        # إنشاء حجز
GET    /api/bookings/[id]   # جلب حجز محدد
PUT    /api/bookings/[id]   # تعديل
DELETE /api/bookings/[id]   # حذف
```

### 💰 Invoices
```bash
GET    /api/invoices        # جلب الفواتير
POST   /api/invoices        # إنشاء فاتورة
GET    /api/invoices/[id]   # جلب فاتورة محددة
PUT    /api/invoices/[id]   # تعديل
DELETE /api/invoices/[id]   # حذف
```

### 🏢 Branches
```bash
GET    /api/branches        # جلب الفروع
POST   /api/branches        # إضافة فرع
GET    /api/branches/[id]   # جلب فرع محدد
PUT    /api/branches/[id]   # تعديل
DELETE /api/branches/[id]   # حذف
```

### 📋 Logs
```bash
GET  /api/logs              # جلب السجلات
POST /api/logs/create       # إنشاء سجل
```

### 🔔 Notifications
```bash
GET  /api/notifications     # جلب الإشعارات
POST /api/notifications     # إنشاء إشعار
PUT  /api/notifications/[id] # تحديث (قراءة)
```

### ⚙️ Settings
```bash
GET /api/settings           # جلب الإعدادات
PUT /api/settings           # تحديث الإعدادات
```

---

## 🤖 WhatsApp Service (Port 3001)

### Endpoints

```bash
GET  /health                        # فحص صحة الخدمة
GET  /status                        # حالة جميع الحسابات
GET  /status/:accountId             # حالة حساب محدد + QR
POST /initialize/:accountId         # تهيئة/ربط حساب
POST /send                          # إرسال رسالة
POST /disconnect/:accountId         # فصل حساب
GET  /chats/:accountId              # جلب محادثات حساب
```

---

## 📤 أمثلة الاستخدام

### مثال 1: تسجيل دخول

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@meras.com",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-123",
      "name": "Admin User",
      "email": "admin@meras.com",
      "role": "ADMIN"
    },
    "token": "temporary-token-uuid-123"
  }
}
```

---

### مثال 2: إضافة جهة اتصال

```bash
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "أحمد محمد",
    "phone": "966501234567",
    "email": "ahmed@example.com",
    "tags": ["vip", "customer"]
  }'
```

---

### مثال 3: إرسال رسالة WhatsApp

```bash
# الخطوة 1: إرسال عبر Next.js API
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv-123",
    "content": "مرحباً بك في ميراس",
    "direction": "OUTGOING",
    "accountId": "acc-main-001"
  }'

# أو مباشرة إلى WhatsApp Service:
curl -X POST http://localhost:3001/send \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-main-001",
    "phoneNumber": "966501234567",
    "message": "مرحباً بك في ميراس"
  }'
```

---

### مثال 4: ربط حساب WhatsApp

```bash
# 1. تهيئة الحساب
curl -X POST http://localhost:3001/initialize/acc-main-001 \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "966501234567",
    "force": false
  }'

# 2. جلب QR Code
curl http://localhost:3001/status/acc-main-001

# Response:
{
  "success": true,
  "accountId": "acc-main-001",
  "isReady": false,
  "status": "QR_GENERATED",
  "qrCode": "data:image/png;base64,..."
}

# 3. امسح QR بهاتفك

# 4. تحقق من الاتصال
curl http://localhost:3001/status/acc-main-001

# Response:
{
  "success": true,
  "accountId": "acc-main-001",
  "isReady": true,
  "status": "CONNECTED",
  "phone": "966501234567"
}
```

---

### مثال 5: فحص صحة WhatsApp Service

```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "success": true,
  "service": "whatsapp-multi-service",
  "totalAccounts": 3,
  "readyAccounts": 2,
  "accounts": [
    {
      "accountId": "acc-main-001",
      "isReady": true,
      "status": "CONNECTED",
      "phone": "966501234567",
      "hasQrCode": false
    },
    {
      "accountId": "acc-main-002",
      "isReady": false,
      "status": "QR_GENERATED",
      "phone": null,
      "hasQrCode": true
    }
  ]
}
```

---

### مثال 6: جلب إحصائيات Dashboard

```bash
curl http://localhost:3000/api/dashboard/stats
```

**Response:**
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
      "messagesByDay": [...],
      "messageTypes": [...]
    },
    "recentConversations": [...],
    "whatsappAccounts": [...],
    "teamPerformance": [...]
  }
}
```

---

## 🔄 سير العمل الكامل

### إرسال رسالة

```
Frontend → POST /api/messages → Next.js API
    ↓
Next.js → POST /send → WhatsApp Service
    ↓
WhatsApp Service → sendMessage() → WhatsApp Web.js
    ↓
Next.js ← Save to DB ← Returns Success
    ↓
Frontend ← Response ← Updates UI
```

### استقبال رسالة

```
WhatsApp User → Sends Message
    ↓
WhatsApp Web.js → on('message') event
    ↓
WhatsApp Service → POST /webhook → Next.js API
    ↓
Next.js API → Save (Contact, Conversation, Message)
    ↓
Database Updated → Frontend polls/websocket → UI Updates
```

---

## 🛠️ تشغيل المشروع

### 1. Next.js (Port 3000)

```bash
# في المجلد الرئيسي
pnpm install
pnpm dev
```

### 2. WhatsApp Service (Port 3001)

```bash
# في whatsapp-service/
cd whatsapp-service
npm install
npm start
```

### 3. Database (MySQL)

```bash
# تشغيل migrations
npx prisma migrate dev

# فتح Prisma Studio
npx prisma studio
```

---

## 📊 قاعدة البيانات (15 جدول)

```
User              → المستخدمين (ADMIN, SUPERVISOR, AGENT)
Contact           → جهات الاتصال
Conversation      → المحادثات
Message           → الرسائل (TEXT, IMAGE, VIDEO, AUDIO, DOCUMENT)
Template          → قوالب الرسائل
BotFlow           → سير العمل الآلي
Branch            → الفروع
WhatsAppAccount   → حسابات WhatsApp
Log               → السجلات
Notification      → الإشعارات
Booking           → الحجوزات
Invoice           → الفواتير
Offer             → العروض
Note              → الملاحظات
Settings          → إعدادات النظام
ApiKey            → مفاتيح API
CrmIntegration    → تكاملات CRM خارجية
```

---

## 🔑 Environment Variables

### Next.js (.env)

```env
DATABASE_URL="mysql://user:password@localhost:3306/meras"
WHATSAPP_SERVICE_URL="http://localhost:3001"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### WhatsApp Service (.env)

```env
PORT=3001
NEXT_APP_URL="http://localhost:3000"
```

---

## 🎯 نصائح سريعة

### ✅ افعل

- استخدم `accountId` وصفي: `meras-riyadh-main`
- تحقق من `isReady` قبل الإرسال
- استخدم `try-catch` دائماً
- احفظ `whatsappAccountId` مع كل رسالة

### ❌ لا تفعل

- لا ترسل من حساب غير جاهز
- لا تنسى معالجة `disconnected` event
- لا تحذف session بدون سبب (`force: true`)
- لا تهمل Rate Limiting في production

---

## 🐛 مشاكل شائعة وحلولها

### Problem: Cannot connect to WhatsApp Service

```bash
# Check if service is running
curl http://localhost:3001/health

# If not, start it:
cd whatsapp-service && npm start
```

### Problem: QR Code not appearing

```bash
# Check status
curl http://localhost:3001/status/acc-main-001

# Restart client
curl -X POST http://localhost:3001/initialize/acc-main-001 \
  -d '{"force": true}'
```

### Problem: Messages not being received

```bash
# Check client status
curl http://localhost:3001/status/acc-main-001

# Check logs
tail -f whatsapp-service/logs/*.log
```

---

## 📚 للمزيد من التفاصيل

- 📘 [API-DOCUMENTATION.md](./API-DOCUMENTATION.md) - وثائق شاملة
- 📗 [WHATSAPP-SERVICE-GUIDE.md](./WHATSAPP-SERVICE-GUIDE.md) - دليل WhatsApp Service
- 📙 [README.md](./README.md) - نظرة عامة على المشروع

---

**آخر تحديث: 18 يناير 2026** ✨
