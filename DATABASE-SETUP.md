# 🚀 إعداد قاعدة البيانات - Meras CRM

## المشكلة الحالية

```
Database `meras_db` does not exist on the database server at `localhost:3306`
```

---

## ✅ الحل 1: استخدام MySQL (موصى به للإنتاج)

### الخطوات:

#### 1. تأكد من تشغيل MySQL Server

**Windows:**
```bash
# تحقق من حالة الخدمة
net start | findstr MySQL

# أو تشغيل MySQL
net start MySQL80  # أو MySQL57 حسب الإصدار
```

**أو عبر XAMPP/WAMP:**
- افتح لوحة التحكم وشغل MySQL

---

#### 2. إنشاء قاعدة البيانات

**طريقة 1: عبر MySQL Command Line**

```bash
mysql -u root -p
```

ثم نفذ:
```sql
CREATE DATABASE meras_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW DATABASES;
EXIT;
```

**طريقة 2: عبر phpMyAdmin**
- افتح [http://localhost/phpmyadmin](http://localhost/phpmyadmin)
- انقر "New" من القائمة اليسرى
- اسم قاعدة البيانات: `meras_db`
- Collation: `utf8mb4_unicode_ci`
- اضغط "Create"

**طريقة 3: عبر ملف SQL**
```bash
mysql -u root -p < setup-mysql-db.sql
```

---

#### 3. إعداد ملف .env

تأكد من وجود ملف `.env` في جذر المشروع بهذا المحتوى:

```env
# Database Configuration
DATABASE_URL="mysql://root:password@localhost:3306/meras_db"

# استبدل:
# - root: باسم مستخدم MySQL
# - password: بكلمة المرور (أو احذفها إذا لم تكن هناك كلمة مرور)
# - localhost:3306: بعنوان السيرفر والبورت
# - meras_db: باسم قاعدة البيانات
```

**مثال بدون كلمة مرور:**
```env
DATABASE_URL="mysql://root@localhost:3306/meras_db"
```

---

#### 4. تطبيق Migrations

```bash
# إنشاء الجداول في قاعدة البيانات
npx prisma migrate deploy

# أو إذا كنت في مرحلة التطوير
npx prisma migrate dev
```

---

#### 5. Seed البيانات الأولية (اختياري)

```bash
# إضافة بيانات تجريبية
npx prisma db seed
```

---

## ✅ الحل 2: استخدام SQLite (أسرع للتطوير)

إذا كنت لا تريد إعداد MySQL الآن، يمكنك التحويل لـ SQLite:

### الخطوات:

#### 1. تعديل `prisma/schema.prisma`

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

#### 2. تعديل أو حذف `DATABASE_URL` من `.env`

اجعلها فارغة أو احذفها:
```env
# DATABASE_URL="mysql://root@localhost:3306/meras_db"
```

#### 3. إعادة إنشاء Migration

```bash
# حذف مجلد migrations القديم
rm -rf prisma/migrations  # أو في PowerShell: Remove-Item -Recurse -Force prisma\migrations

# إنشاء migration جديد لـ SQLite
npx prisma migrate dev --name init

# توليد Prisma Client
npx prisma generate
```

---

## 🔍 التحقق من نجاح الإعداد

### 1. فحص الاتصال بقاعدة البيانات

```bash
npx prisma db pull
```

يجب أن تحصل على رسالة نجاح.

### 2. فتح Prisma Studio لعرض البيانات

```bash
npx prisma studio
```

يفتح متصفح على [http://localhost:5555](http://localhost:5555)

### 3. تشغيل المشروع

```bash
npm run dev
```

يجب أن يعمل بدون أخطاء!

---

## 🐛 حل المشاكل الشائعة

### ❌ Error: P1001 - Can't reach database server

**الحل:**
- تأكد من تشغيل MySQL Server
- تحقق من البورت (3306 هو الافتراضي)
- جرب: `telnet localhost 3306`

---

### ❌ Error: P1003 - Database does not exist

**الحل:**
- أنشئ قاعدة البيانات يدوياً (راجع الخطوة 2 أعلاه)
- أو استخدم: `npx prisma db push` (يُنشئ قاعدة البيانات تلقائياً)

---

### ❌ Error: Access denied for user

**الحل:**
- تحقق من اسم المستخدم وكلمة المرور في `DATABASE_URL`
- تأكد من أن المستخدم لديه صلاحيات على `meras_db`

```sql
GRANT ALL PRIVILEGES ON meras_db.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

---

### ❌ Error: Module not found '@prisma/client'

**الحل:**
```bash
npx prisma generate
```

---

## 📊 أوامر Prisma المفيدة

```bash
# توليد Prisma Client
npx prisma generate

# إنشاء migration جديد
npx prisma migrate dev --name migration_name

# تطبيق migrations على production
npx prisma migrate deploy

# دفع schema مباشرة بدون migrations (للتطوير)
npx prisma db push

# فتح Prisma Studio (UI لعرض البيانات)
npx prisma studio

# سحب schema من قاعدة البيانات الحالية
npx prisma db pull

# إعادة ضبط قاعدة البيانات (⚠️ يحذف كل البيانات!)
npx prisma migrate reset
```

---

## 🎯 الخطوات الموصى بها (ترتيب سريع)

1. ✅ تثبيت pnpm: `npm install -g pnpm` (تم ✅)
2. ✅ توليد Prisma Client: `npx prisma generate` (تم ✅)
3. ⏳ إنشاء قاعدة بيانات MySQL: راجع "الحل 1" أعلاه
4. ⏳ إعداد `.env` بـ `DATABASE_URL` الصحيح
5. ⏳ تطبيق migrations: `npx prisma migrate deploy`
6. ⏳ تشغيل المشروع: `npm run dev`

---

**تم التحديث:** 18 يناير 2026
