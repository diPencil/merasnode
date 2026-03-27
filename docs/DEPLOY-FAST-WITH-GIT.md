# Deploy بسرعة (بدون رفع ملفات كل مرة)

لو رفع الملفات كل مرة بياخد وقت، استخدم **Git**: التحديث يبقى **git push** (ثواني) والسيرفر يعمل **git pull** — مفيش scp/rsync.

---

## إعداد مرة واحدة

### 1) ريبو على GitHub (أو GitLab)

- روح https://github.com/new
- اعمل ريبو **Private** اسمه مثلاً `MerasNode`
- ما تاخدش README ولا .gitignore (المشروع عندك جاهز)

### 2) على جهازك (من مجلد المشروع)

```powershell
git init
git add .
git commit -m "Initial"
git remote add origin https://github.com/YOUR_USERNAME/MerasNode.git
git branch -M main
git push -u origin main
```

(غيّر `YOUR_USERNAME` و `MerasNode` لو الاسم مختلف.)

### 3) على السيرفر (EC2)

لو المجلد موجود من قبل (مثلاً رفعته بـ upload-to-aws):

```bash
cd ~/MerasNode
git init
git remote add origin https://github.com/YOUR_USERNAME/MerasNode.git
git fetch origin
git reset --hard origin/main
```

أو لو مشروع جديد على السيرفر:

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/MerasNode.git
cd MerasNode
```

### 4) تفعيل الـ deploy السريع

في **`scripts\deploy.local.ps1`** ضيف السطر ده:

```powershell
$env:DEPLOY_USE_GIT = "1"
```

احفظ الملف.

---

## بعد كده

كل ما تشغّل **`npm run deploy`**:

1. السكربت يعمل **git push** من جهازك (بس التغييرات — سريع).
2. يتصل بالسيرفر ويشغّل **git pull** ثم **npm install** و **build** و **pm2 restart**.

**مافيش رفع ملفات** من جهازك للسيرفر؛ كل التحديث عبر Git فالبوقت يقلّ جداً.

---

## ⚠️ مهم: تحديث المفاتيح (`.env`) على السيرفر

**ملف `.env` (المفاتيح والمتغيرات البيئية) غير مضاف في Git** (موجود في `.gitignore` لأسباب أمان).  
يعني: أي تعديل تعمله على المفاتيح **على جهازك** **لن يظهر على السيرفر** بعد `git pull` — السيرفر يبقى يستخدم نسخة `.env` القديمة اللي عليه.

### لو غيّرت مفاتيح أو إعدادات في `.env` محلياً

يجب تحديث السيرفر بإحدى الطريقتين:

#### الطريقة 1: نسخ `.env` من جهازك إلى السيرفر (موصى بها)

من **PowerShell على جهازك** (من مجلد المشروع، بعد ما تعدّل `.env`):

```powershell
scp -i "$env:USERPROFILE\Downloads\meras-key.pem" .env ec2-user@100.24.75.110:~/MerasNode/.env
```

ثم على السيرفر أعد تشغيل التطبيق:

```bash
ssh -i "$env:USERPROFILE\Downloads\meras-key.pem" ec2-user@100.24.75.110
cd MerasNode
pm2 restart ecosystem.config.js
```

(أو شغّل سكربت التحديث: `./scripts/deploy-on-ec2.sh` بعد الـ `scp`.)

#### الطريقة 2: تعديل `.env` مباشرة على السيرفر

```bash
ssh -i "$env:USERPROFILE\Downloads\meras-key.pem" ec2-user@100.24.75.110
cd MerasNode
nano .env
# عدّل القيم ثم احفظ (Ctrl+O ثم Enter ثم Ctrl+X)
pm2 restart ecosystem.config.js
```

**بعد أي تعديل على `.env` على السيرفر لازم تعمل `pm2 restart` عشان التطبيق يقرأ القيم الجديدة.**
