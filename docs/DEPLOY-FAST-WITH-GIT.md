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
