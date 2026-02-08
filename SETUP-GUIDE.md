# 🚀 دليل الإعداد - Meras CRM Setup Guide

## 📋 المتطلبات الأساسية | Prerequisites

- Node.js (v18 or higher)
- MySQL Database
- npm or pnpm

## 🔧 خطوات الإعداد | Setup Steps

### 1️⃣ تثبيت المكتبات | Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2️⃣ إعداد قاعدة البيانات | Database Setup

#### أ. إنشاء قاعدة البيانات | Create Database

```bash
mysql -u root -p < setup-mysql-db.sql
```

أو يدوياً:
```sql
CREATE DATABASE meras_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### ب. ضبط متغيرات البيئة | Configure Environment Variables

إنشاء ملف `.env` في المجلد الرئيسي:

```env
DATABASE_URL="mysql://username:password@localhost:3306/meras_db"
```

**مثال:**
```env
DATABASE_URL="mysql://root:mypassword@localhost:3306/meras_db"
```

### 3️⃣ تطبيق Schema و إنشاء البيانات الأولية | Apply Schema & Create Initial Data

#### الطريقة الأولى: CLI Tool الموحد (مُوصى به) ✅

```bash
# إعداد كامل (Schema + Admin + Settings + Sample Data)
npm run setup

# أو للإعداد السريع (Admin فقط)
npm run setup:quick

# أو للقائمة التفاعلية
npm run setup:menu
```

#### الطريقة الثانية: يدوياً

```bash
# تطبيق Schema
npx prisma db push

# إنشاء Admin (كلمة المرور مشفرة)
node create_admin.js
```

## 🔐 بيانات الدخول الافتراضية | Default Login Credentials

بعد الإعداد، استخدم:

- **Email:** `admin@meras.com`
- **Password:** `admin123`

⚠️ **مهم:** غيّر كلمة المرور بعد أول تسجيل دخول!

## 🎯 تشغيل المشروع | Running the Project

### Development Mode

```bash
# تشغيل Next.js + WhatsApp Service معاً
npm run dev

# تشغيل Next.js فقط
npm run dev:next

# تشغيل WhatsApp Service فقط
npm run dev:whatsapp
```

### Production Mode

```bash
# Build
npm run build

# Start
npm run start:prod
```

## 🛠️ أوامر CLI المتاحة | Available CLI Commands

```bash
# Full setup with everything
node setup-cli.js full

# Quick admin creation
node setup-cli.js quick

# Create sample data
node setup-cli.js sample

# Check database connection
node setup-cli.js check

# Interactive menu
node setup-cli.js menu
```

## 📊 إدارة قاعدة البيانات | Database Management

```bash
# Open Prisma Studio (GUI for database)
npm run db:studio

# Push schema changes
npm run db:push

# Reset database (from CLI menu)
node setup-cli.js menu
# Then select option 5
```

## ✅ التحسينات المطبقة | Applied Improvements

### 🔐 1. تشفير كلمات المرور | Password Hashing

- ✅ جميع كلمات المرور الآن مشفرة باستخدام `bcryptjs`
- ✅ يشمل: Login, Create Admin, Create Agent/User
- ✅ تشفير آمن بـ 10 salt rounds

### 🎯 2. أداة CLI موحدة | Unified CLI Tool

- ✅ ملف واحد لكل عمليات الإعداد
- ✅ قائمة تفاعلية سهلة الاستخدام
- ✅ إنشاء Admin, Users, Sample Data
- ✅ إعادة تعيين قاعدة البيانات
- ✅ فحص الاتصال بقاعدة البيانات

### ⚡ 3. إصلاح Turbopack | Turbopack Fix

- ✅ تكوين محسّن لـ Next.js
- ✅ زيادة وقت الانتظار قبل بدء WhatsApp Service (من 3 إلى 5 ثواني)
- ✅ إضافة `serverExternalPackages` للمكتبات الخارجية
- ✅ تحسين إعدادات webpack

### 🚀 4. تحسين الأداء | Performance Optimization

- ✅ تقليل تكرار Polling (من 3 ثواني إلى 4-5 ثواني)
- ✅ تحسين AuthGuard باستخدام `useLayoutEffect`
- ✅ إضافة فحص التغييرات قبل تحديث State
- ✅ تقليل عدد Re-renders غير الضرورية
- ✅ تحسين عرض Loading States

## 🐛 حل المشاكل الشائعة | Troubleshooting

### مشكلة اتصال قاعدة البيانات

```bash
# تحقق من الاتصال
node setup-cli.js check

# تأكد من:
# 1. MySQL يعمل
# 2. اسم المستخدم وكلمة المرور صحيحة في .env
# 3. قاعدة البيانات موجودة
```

### خطأ Prisma

```bash
# إعادة توليد Prisma Client
npx prisma generate

# إعادة تطبيق Schema
npx prisma db push
```

### خطأ Turbopack عند التشغيل

- الحل: تم إصلاحه في الإعدادات الجديدة
- إذا استمر: جرب `npm run dev:next` فقط أولاً

## 📝 ملاحظات مهمة | Important Notes

1. **الأمان:** كلمات المرور الآن مشفرة بالكامل ✅
2. **أداة CLI:** استخدم `setup-cli.js` لجميع عمليات الإعداد
3. **الأداء:** تم تحسين سرعة التنقل بين الصفحات
4. **Turbopack:** تم حل مشاكل التشغيل

## 🆘 الدعم | Support

للمساعدة أو الإبلاغ عن مشاكل، راجع:
- Database Schema: `DATABASE-SCHEMA.md`
- API Documentation: `API-DOCUMENTATION.md`
- System Check: `SYSTEM-CHECK.md`

---

**تم التحديث:** يناير 2026  
**الإصدار:** 2.0 - Optimized & Secured
