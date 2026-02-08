# خطوات رفع MerasNode على AWS والربط مع اللوكال

## ما الذي سنفعله؟

1. إنشاء سيرفر (EC2) على AWS
2. تثبيت المشروع وتشغيله على السيرفر
3. ربط قاعدة البيانات (على AWS أو من عندك)
4. (اختياري) مزامنة التعديلات من جهازك إلى السيرفر

---

## الخطوة 1: إنشاء سيرفر EC2 على AWS

### 1.1 الدخول لـ EC2

1. من **AWS Console** (الصفحة اللي عندك دلوقتي) اكتب في **Search** أعلى: **EC2**
2. اضغط **EC2** من النتائج (Elastic Compute Cloud)
3. تأكد إن الـ **Region** أعلى اليمين مناسبة (مثلاً **US East N. Virginia** أو أي region قريب منك)

### 1.2 تشغيل Instance (سيرفر جديد)

1. من القائمة اليسرى: **Instances** → **Instances**
2. اضغط الزر البرتقالي **Launch instance**

### 1.3 إعدادات الـ Instance

| الحقل | القيمة المقترحة |
|--------|------------------|
| **Name** | `meras-node` (أو أي اسم) |
| **OS** | **Ubuntu Server** (أحدث إصدار 22.04 LTS) |
| **Instance type** | `t3.small` أو `t3.medium` (للواتساب أفضل medium) |
| **Key pair** | **Create new key pair** → اسم مثلاً `meras-key` → **.pem** → حمّل الملف واحفظه بأمان |
| **Network / Security group** | اسمح بـ: **SSH (22)** من عنوانك، و **HTTP (80)** و **HTTPS (443)** من أي مكان (0.0.0.0/0) إن كنت تريد الموقع يفتح من الإنترنت |
| **Storage** | 20–30 GB |

3. اضغط **Launch instance**
4. انتظر حتى **Instance state** = **Running**

### 1.4 عنوان السيرفر (IP)

1. من قائمة الـ Instances اضغط على الـ Instance اللي أنشأته
2. انسخ **Public IPv4 address** (مثلاً `54.123.45.67`) — هذا عنوان السيرفر للاتصال

---

## الخطوة 2: الاتصال بالسيرفر عبر SSH

### من Windows (PowerShell أو CMD)

1. ضع ملف الـ `.pem` (مثلاً `meras-key.pem`) في مجلد معروف (مثلاً `Downloads`)
2. افتح **PowerShell** واكتب (غيّر المسار واسم الملف والـ IP):

```powershell
cd $env:USERPROFILE\Downloads
ssh -i "meras-key.pem" ubuntu@54.123.45.67
```

(استبدل `54.123.45.67` بالـ **Public IP** الحقيقي لسيرفرك)

3. لو سألك "Are you sure..." اكتب `yes` واضغط Enter
4. لو دخلت بدون كلمة مرور وظهر سطر يبدأ بـ `ubuntu@ip-...` فأنت **متصل بالسيرفر**

---

## الخطوة 3: تثبيت Node.js و PM2 على السيرفر

**وهذه الأوامر كلها داخل الـ SSH (على السيرفر):**

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# تثبيت PM2
sudo npm install -g pm2

# التأكد
node -v
pm2 -v
```

---

## الخطوة 4: رفع المشروع على السيرفر

اختر **واحدة** من الطريقتين:

### الطريقة أ: رفع من جهازك (Git)

**على جهازك (اللوكال):**

1. ارفع المشروع على **GitHub** (أو GitLab):
   - أنشئ Repository جديد
   - من مجلد المشروع:
   ```bash
   git init
   git add .
   git commit -m "Initial"
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git push -u origin main
   ```

**على السيرفر (داخل SSH):**

```bash
# تثبيت git إن لم يكن موجوداً
sudo apt install -y git

# استنساخ المشروع (غيّر الرابط لرابط ريبو الخاص بك)
cd ~
git clone https://github.com/YOUR_USER/YOUR_REPO.git MerasNode
cd MerasNode
```

### الطريقة ب: نسخ الملفات يدوياً (بدون Git)

**على جهازك (PowerShell):** من مجلد المشروع (غيّر المسار والـ IP واسم الملف .pem):

```powershell
scp -i "$env:USERPROFILE\Downloads\meras-key.pem" -r .\* ubuntu@54.123.45.67:~/MerasNode/
```

(أو استخدم برنامج مثل **WinSCP** لسحب وإفلات المجلد إلى `~/MerasNode/` على السيرفر)

**على السيرفر:**

```bash
mkdir -p ~/MerasNode
cd ~/MerasNode
# بعد انتهاء الـ scp أو الرفع بالـ WinSCP تأكد أن الملفات موجودة:
ls -la
```

---

## الخطوة 5: قاعدة البيانات وملف البيئة

- لو قاعدة البيانات على **نفس السيرفر**: ثبّت MySQL أو PostgreSQL وأنشئ قاعدة وضيف رابطها في `.env`
- لو قاعدة البيانات **على جهازك أو سيرفر آخر**: استخدم **IP عام** أو استخدم **VPN/بورت فورورد** وضيف في `.env` على السيرفر نفس `DATABASE_URL` اللي تستخدمه (مع تعديل الـ host للـ IP أو الدومين)

**على السيرفر:**

```bash
cd ~/MerasNode

# إنشاء ملف .env (عدّل القيم حسبك)
nano .env
```

أضف على الأقل (وباقي المتغيرات مثل اللوكال):

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DB_NAME"
NEXT_APP_URL="http://localhost:3000"
JWT_SECRET="ضع_سكربت_طويل_عشوائي"
```

احفظ (في nano: Ctrl+O ثم Enter ثم Ctrl+X).

ثم:

```bash
# تثبيت التبعيات
npm install

# إنشاء مجلد الجلسات واللوجات
mkdir -p whatsapp-sessions logs

# توليد Prisma وتطبيق الـ schema
npx prisma generate
npx prisma db push
```

---

## الخطوة 6: البناء والتشغيل بـ PM2

**على السيرفر:**

```bash
cd ~/MerasNode

# بناء Next.js
npm run build

# تشغيل التطبيق وخدمة الواتساب
pm2 start ecosystem.config.js

# التشغيل عند إعادة تشغيل السيرفر
pm2 startup
pm2 save
```

**التحقق:**

```bash
pm2 list
pm2 logs
```

- التطبيق يعمل على البورت **3000** وخدمة الواتساب على **3001** داخل السيرفر.

---

## الخطوة 7: فتح الموقع من الإنترنت

- إما تفتح الموقع بـ **IP السيرفر + البورت**:  
  `http://54.123.45.67:3000`  
  (تأكد أن **Security Group** يسمح بالبورت **3000** من 0.0.0.0/0 إن لزم)
- أو تضع **Nginx** كـ reverse proxy على البورت 80 وتوجه الدومين أو الـ IP إلى التطبيق (البورت 3000 داخلياً).

**مثال إعداد سريع لـ Nginx (اختياري):**

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/default
```

استبدل `location /` بـ شيء من هذا القبيل:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

ثم:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

بعدها تفتح الموقع من المتصفح: `http://54.123.45.67` (بدون :3000).

---

## الخطوة 8: ربط اللوكال بالسيرفر والتعديلات "تسمع" على AWS

### خيار 1: التعديل مباشرة على السيرفر (الأبسط — التعديلات فوراً)

1. من **VS Code** أو **Cursor**:  
   **Remote - SSH** → Connect to Host → `ubuntu@54.123.45.67`
2. افتح المجلد `/home/ubuntu/MerasNode`
3. عدّل أي ملف واحفظ
4. لو شغّلت `npm run dev` على السيرفر: التعديلات تظهر مع الـ hot reload  
   لو شغّلت `pm2`: تحتاج بعد التعديل تعمل `npm run build` ثم `pm2 restart all`

### خيار 2: التعديل على جهازك ومزامنة إلى السيرفر

**على جهازك (PowerShell)** من مجلد المشروع، شغّل مرة واحدة أو على فترات (غيّر المسار والـ IP واسم الـ .pem):

```powershell
rsync -avz -e "ssh -i $env:USERPROFILE\Downloads\meras-key.pem" --exclude node_modules --exclude .next --exclude whatsapp-sessions . ubuntu@54.123.45.67:~/MerasNode/
```

بعد المزامنة ادخل SSH على السيرفر ولو بتستخدم PM2:

```bash
cd ~/MerasNode && npm run build && pm2 restart all
```

كده التعديلات اللي عملتها لوكال "تسمع" على السيرفر بعد الـ rsync والـ restart.

---

## ملخص سريع

| الخطوة | أين | ماذا |
|--------|-----|------|
| 1 | AWS Console | EC2 → Launch instance (Ubuntu, t3.small/medium, key pair, فتح 22, 80, 443) |
| 2 | جهازك | SSH بـ `.pem`: `ssh -i meras-key.pem ubuntu@IP` |
| 3 | السيرفر | تثبيت Node 20 و PM2 |
| 4 | السيرفر + جهازك | رفع المشروع (Git clone أو SCP/rsync) إلى `~/MerasNode` |
| 5 | السيرفر | `.env` + `npm install` + `prisma generate` + `prisma db push` |
| 6 | السيرفر | `npm run build` ثم `pm2 start ecosystem.config.js` |
| 7 | السيرفر | (اختياري) Nginx على 80 → 3000 |
| 8 | جهازك | ربط لوكال: Remote SSH أو rsync ثم build و pm2 restart |

---

## ملاحظات مهمة للواتساب على AWS

- **جلسات الواتساب** محفوظة في `whatsapp-sessions` على السيرفر؛ لا تحذف المجلد عشوائياً.
- أول مرة تربط رقم واتساب: ادخل على `http://IP:3000/whatsapp` (أو الدومين) وامسح الـ QR من الموبايل.
- لو غيّرت سيرفر أو مسحت الـ instance، تحتاج تربط الواتساب من جديد (مسح QR مرة ثانية).

لو حابب نخطو خطوة خطوة من نقطة معيّنة (مثلاً من بعد إنشاء الـ Instance أو من الـ SSH)، اكتب لي من وين بالضبط وأكمّل معاك هناك.
