# 🚀 Quick Start Guide - WhatChimp Style Multi-Account

## ✅ ما تم عمله:

1. ✅ **Multi-Client Manager** - إدارة 100+ رقم
2. ✅ **Database Schema Updated** - علاقة بين Messages و WhatsAppAccount  
3. ✅ **Webhook Updated** - يستقبل accountId
4. ✅ **Messages API Updated** - إرسال من account محدد
5. ✅ **UI Page** - صفحة إدارة الأرقام
6. ✅ **Navigation Link** - رابط في القائمة

---

## 🎯 خطوات التشغيل:

### 1. تشغيل MySQL Database

```bash
# تأكد إن MySQL شغال على:
# Host: localhost
# Port: 3306
# Database: meras_db

# أو شغله لو مش شغال
```

### 2. تطبيق Database Migration

```bash
npx prisma migrate dev --name add_whatsapp_account_to_messages
```

### 3. تشغيل WhatsApp Multi-Service

```bash
cd whatsapp-service
node server-multi.js
```

**سترى:**
```
╔═══════════════════════════════════════════════════╗
║  🚀 WhatsApp Multi-Account Service                ║
║  📡 Running on: http://localhost:3001             ║
╚═══════════════════════════════════════════════════╝
✅ Service ready
```

### 4. تشغيل Next.js App (في terminal جديد)

```bash
npm run dev
```

### 5. فتح المتصفح

```
http://localhost:3000
```

### 6. الذهاب لصفحة WhatsApp Accounts

اضغط على **"WhatsApp Accounts"** في القائمة الجانبية

أو:
```
http://localhost:3000/whatsapp/accounts
```

---

## 📱 إضافة أول رقم:

### 1. اضغط "Add Account"

املأ:
- **Account Name**: Main Sales
- **Phone Number**: 966501234567

### 2. اضغط "Add Account"

سيظهر QR Code تلقائياً

### 3. مسح QR Code من الموبايل

1. افتح WhatsApp على موبايلك
2. اذهب لـ **Settings** (⋮)
3. اختر **Linked Devices**
4. اضغط **Link a Device**
5. امسح الـ QR Code

### 4. انتظر الاتصال

بعد المسح:
- ✅ Status سيتغير لـ "Connected"
- ✅ الموبايل سيظل شغال عادي
- ✅ النظام سيكون متصل

---

## 🎉 إضافة أرقام إضافية:

كرر نفس الخطوات لكل رقم!

```
Account 1: Main Sales (966501234567)
Account 2: Support (966501234568)
Account 3: Marketing (966501234569)
...
Account 100: Branch 10 (966501234666)
```

---

## 💬 إرسال رسالة من رقم محدد:

في الـ Inbox أو API:

```javascript
// الطريقة 1: من UI
// سيضاف Account Selector قريباً

// الطريقة 2: من API
POST /api/messages
{
  "conversationId": "xxx",
  "content": "مرحباً!",
  "accountId": "account-1"  // ← من أي رقم
}
```

---

## 🔧 Troubleshooting:

### Problem: QR Code لا يظهر

**Solution:**
```bash
# تأكد أن WhatsApp service شغال:
cd whatsapp-service
node server-multi.js

# Check status:
curl http://localhost:3001/health
```

### Problem: Database connection error

**Solution:**
```bash
# تأكد أن MySQL شغال
# تحقق من .env:
DATABASE_URL="mysql://user:password@localhost:3306/meras_db"

# Run migration:
npx prisma migrate dev
```

### Problem: Account عالق على "Initializing"

**Solution:**
اضغط "Reconnect" في الصفحة

أو:
```bash
# Force restart من API:
POST http://localhost:3001/initialize/account-1
Body: { "force": true }
```

---

## 📊 مراقبة الحالة:

### Check All Accounts:
```bash
curl http://localhost:3001/status
```

### Check Specific Account:
```bash
curl http://localhost:3001/status/account-1
```

### Health Check:
```bash
curl http://localhost:3001/health
```

---

## 🎯 الميزات الجديدة:

```diff
+ إدارة 100+ رقم واتساب
+ QR Code منفصل لكل رقم
+ Status real-time لكل account
+ Connect/Disconnect لكل account
+ إرسال من account محدد
+ استقبال مع تتبع الـ account
+ UI احترافي
+ Multi-device (الموبايل شغال!)
```

---

## 📚 الملفات الرئيسية:

```
whatsapp-service/
├── multi-client-manager.js  ← Core logic
├── server-multi.js           ← API endpoints
└── server.js                 ← Old (single account)

app/whatsapp/accounts/
└── page.tsx                  ← Management UI

app/api/whatsapp/accounts/
└── route.ts                  ← API routes

prisma/schema.prisma          ← Updated schema
```

---

## 🎉 خلصنا!

**أنت الآن عندك نظام WhatChimp كامل! 🚀**

- ✅ Multi-Account Support
- ✅ WhatsApp Multi-Device
- ✅ Professional UI
- ✅ Full CRM Integration
- ✅ **Free & Open Source!**

---

## 📞 للمساعدة:

اقرأ: `WHATCHIMP-STYLE-SETUP.md` للتفاصيل الكاملة

**استمتع! 💪**

