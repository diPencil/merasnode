# سكربتات الربط مع AWS

**قائمة الإعداد الكاملة (مرة واحدة):** راجع [../docs/SETUP-DEPLOY-CHECKLIST.md](../docs/SETUP-DEPLOY-CHECKLIST.md).

## السكربتات

| الملف | أين يشغّل | الوظيفة |
|-------|-----------|---------|
| `deploy-on-ec2.sh` | على EC2 (Linux) | `git pull` → `npm install` → `npm run build` → إعادة تشغيل pm2 |
| `deploy-from-local.ps1` | على جهازك (Windows PowerShell) | رفع التعديلات لـ Git ثم تنفيذ `deploy-on-ec2.sh` على السيرفر عبر SSH |
| `deploy.config.ps1.example` | مرجع | نموذج لإعداد محلي — انسخه إلى `deploy.local.ps1` وعدّل القيم |

## تهيئة الاستخدام من جهازك (مرة واحدة)

1. **على EC2:**  
   ```bash
   chmod +x ~/MerasNode/scripts/deploy-on-ec2.sh
   ```

2. **على جهازك:** إنشاء ملف إعداد محلي (لا يُرفع على Git):
   ```powershell
   Copy-Item .\scripts\deploy.config.ps1.example .\scripts\deploy.local.ps1
   notepad .\scripts\deploy.local.ps1
   ```
   عدّل `DEPLOY_EC2` (عنوان السيرفر) و `DEPLOY_SSH_KEY` (مسار المفتاح .pem).

3. **تشغيل التحديث:** من مجلد المشروع:
   ```powershell
   .\scripts\deploy-from-local.ps1
   ```

## خيارات اختيارية

- **تحديث السيرفر فقط بدون push:**  
  ```powershell
  $env:DEPLOY_NO_PUSH = "1"
  .\scripts\deploy-from-local.ps1
  ```
- **رسالة commit مخصصة:**  
  ```powershell
  $env:DEPLOY_COMMIT_MSG = "وصف التعديل"
  .\scripts\deploy-from-local.ps1
  ```

## ربط اللوكال بالسيرفر (السيناريو الكامل)

راجع [../docs/LOCAL-TO-AWS-WORKFLOW.md](../docs/LOCAL-TO-AWS-WORKFLOW.md) لشرح ربط المشروع المحلي بالسيرفر (Git أو مزامنة ملفات).
