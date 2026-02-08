-- 🗄️ إنشاء قاعدة بيانات Meras CRM
-- Meras CRM Database Creation Script

CREATE DATABASE IF NOT EXISTS meras_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- استخدام قاعدة البيانات
USE meras_db;

-- عرض رسالة نجاح
SELECT 'Database meras_db created successfully!' AS Status;

-- ملاحظة: بعد إنشاء قاعدة البيانات، استخدم الأمر التالي:
-- Note: After creating the database, run the following command:
-- 
-- npx prisma db push
--
-- ثم استخدم أداة CLI الموحدة لإنشاء البيانات الأولية:
-- Then use the unified CLI tool to create initial data:
--
-- node setup-cli.js full
-- 
-- أو للإنشاء السريع للأدمن فقط:
-- Or for quick admin creation only:
--
-- node setup-cli.js quick
