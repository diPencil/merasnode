# قائمة إعداد الربط بين اللوكال والسيرفر (مرة واحدة)

نفّذ الخطوات التالية **مرة واحدة** ثم بعدها تستخدم أمراً واحداً من جهازك لتحديث السيرفر.

---

## على السيرفر (EC2)

1. **تثبيت المشروع وتهيئته** كما في [AWS-DEPLOY-STEPS.md](./AWS-DEPLOY-STEPS.md):
   - Node 20 (عبر nvm)
   - مجلد `whatsapp-service` موجود (من Git أو نسخ يدوي)
   - `npm install` و `npm run build`
   - pm2 لتشغيل التطبيق

2. **تفعيل سكربت التحديث:**
   ```bash
   chmod +x ~/MerasNode/scripts/deploy-on-ec2.sh
   ```

3. **تجربة التحديث يدوياً (اختياري):**
   ```bash
   cd ~/MerasNode && ./scripts/deploy-on-ec2.sh
   ```
   إذا نجح، معناها أي `git push` من جهازك يمكن أن يتبعه هذا الأمر لتحديث السيرفر.

---

## على جهازك (ويندوز)

1. **من جذر المشروع شغّل مرة واحدة:**
   ```powershell
   .\deploy.ps1
   ```
   أول مرة ينشئ لك `scripts\deploy.local.ps1` ويفتحه — عدّل فيه:
   - **DEPLOY_EC2:** عنوان EC2 الحقيقي، صيغة: `ec2-user@ec2-xx-xx-xx.compute-1.amazonaws.com`
   - **DEPLOY_SSH_KEY:** مسار ملف المفتاح `.pem` على جهازك

2. **احفظ الملف** ثم شغّل مرة ثانية:
   ```powershell
   .\deploy.ps1
   ```
   السكربت يرفع التعديلات إلى Git ويتصل بالسيرفر ويحدّثه.

---

## الاستخدام اليومي

من جذر المشروع:
```powershell
.\deploy.ps1
```
لا تحتاج تعيد ضبط أي إعداد إلا لو غيّرت عنوان السيرفر أو مسار المفتاح.

---

## ملاحظات

- ملف **`deploy.local.ps1`** غير مرفوع على Git (مضاف في `.gitignore`) لأنه يحتوي عنوان السيرفر ومسار المفتاح.
- لو مسار المشروع على السيرفر ليس `~/MerasNode`، أضف في `deploy.local.ps1`:  
  `$env:DEPLOY_REMOTE_DIR = "~/مسار/المشروع"`
- لتحديث السيرفر **بدون** عمل commit/push (مثلاً السيرفر فيه تغييرات وتريد فقط pull + build + restart):  
  `$env:DEPLOY_NO_PUSH = "1"; .\scripts\deploy-from-local.ps1`
