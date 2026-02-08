# خطوات رفع MerasNode على AWS EC2

## ⚠️ متطلبات مهمة
- **Next.js يحتاج Node.js >= 20.9.0** — على EC2 يجب ترقية Node من 18 إلى 20 (انظر "ترقية Node على EC2" أدناه).
- تأكد أن مجلد **`whatsapp-service`** موجود على السيرفر (انظر "خطأ MODULE_NOT_FOUND" أدناه).

## أوامر التشغيل على EC2 (بعد `npm install`)

```bash
# 1) معالجة الثغرات إن أمكن (اختياري، بدون --force أولاً)
npm audit fix

# 2) بناء المشروع
npm run build

# 3) تشغيل الإنتاج (Next + خدمة واتساب)
npm run start:prod
```

أو تشغيل Next فقط إذا الـ WhatsApp service على سيرفر آخر:

```bash
npm run build
npm start
```

## تشغيل في الخلفية (حتى بعد إغلاق SSH)

استخدم `pm2` أو `screen`/`nohup`:

```bash
# تثبيت pm2 (مرة واحدة)
npm install -g pm2

# تشغيل التطبيق
npm run build
pm2 start npm --name "merasnode" -- run start:prod

# حفظ القائمة حتى بعد إعادة التشغيل
pm2 save
pm2 startup
```

## ترقية Node على EC2 (مطلوب لـ Next.js)

Next.js 16 يطلب **Node >= 20.9.0**. على EC2 ثبّت Node 20 عبر **nvm**:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v   # يجب أن يظهر v20.x
```

ثم من مجلد المشروع:

```bash
cd ~/MerasNode
rm -rf node_modules package-lock.json
npm install
npm run build
npm run start:prod
```

---

## مشاكل شائعة

### خطأ: `Cannot find module '.../whatsapp-service/server-multi.js'`

يعني أن مجلد **`whatsapp-service`** غير موجود على EC2.

**على EC2 تحقق:**
```bash
ls ~/MerasNode/whatsapp-service/
# إذا ظهر "No such file or directory" فالمجلد ناقص.
```

**الحل:**
1. إذا رفعت المشروع بـ **git**: غالباً المجلد **غير مضاف في الريبو** (untracked). أضفه وارفع:
   - **على جهازك (مرة واحدة):**
   ```bash
   git add whatsapp-service/
   git commit -m "Add whatsapp-service for deployment"
   git push
   ```
   - **على EC2:** `cd ~/MerasNode && git pull`
2. إذا رفعت الملفات يدوياً (scp/rsync): انسخ مجلد `whatsapp-service` كاملاً إلى `~/MerasNode/whatsapp-service/`.

**تشغيل الموقع فقط بدون خدمة واتساب (مؤقتاً):**
```bash
npm run build
npm start
```
هذا يشغّل Next.js فقط؛ لن تعمل ميزات الواتساب حتى ترفع مجلد `whatsapp-service` وتشغّل `npm run start:prod`.

---

---

## ربط اللوكال بالسيرفر (لما تصلح لوكال يحدّث السيرفر)

لو عايز تشتغل على المشروع عندك وتخلي السيرفر يسمع التعديلات، راجع **[ربط المشروع المحلي بالسيرفر (LOCAL-TO-AWS-WORKFLOW.md)](./LOCAL-TO-AWS-WORKFLOW.md)**. هناك سكربت على EC2 (`scripts/deploy-on-ec2.sh`) وسكربت من جهازك (`scripts/deploy-from-local.ps1`) لتنفيذ push ثم تحديث السيرفر بأمر واحد.

---

**الخلاصة:** ثبّت Node 20 على EC2، تأكد من وجود مجلد `whatsapp-service`، ثم `npm run build` و `npm run start:prod`.
