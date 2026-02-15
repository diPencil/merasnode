#!/usr/bin/env bash
# تشغيل هذا السكربت على EC2 بعد أي git push لتحديث التطبيق
# الاستخدام: cd ~/MerasNode && ./scripts/deploy-on-ec2.sh

set -e
cd "$(dirname "$0")/.."
PROJECT_DIR="$PWD"

# تحميل .env أولاً (للبناء: NEXT_PUBLIC_APP_URL، ولـ pm2: NEXT_APP_URL)
if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo "==> تم تحميل .env"
fi

# استخدام Node 20 إن وُجد nvm (مطلوب لـ Next.js)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  echo "==> تحميل nvm واستخدام Node 20..."
  . "$HOME/.nvm/nvm.sh"
  nvm use 20 2>/dev/null || nvm use default 2>/dev/null || true
fi

echo "==> Project: $PROJECT_DIR (Node: $(node -v))"
mkdir -p logs
mkdir -p public/uploads/whatsapp
if [ -d ".git" ]; then
  echo "==> Pulling from Git..."
  git pull
else
  echo "==> No Git repo, skipping pull (you deploy files directly)."
fi

echo "==> Installing dependencies..."
npm install

echo "==> بناء المشروع..."
npm run build

echo "==> إعادة تشغيل التطبيق (pm2)..."
if pm2 describe meras-nextjs &>/dev/null || pm2 describe meras-whatsapp &>/dev/null; then
  pm2 restart ecosystem.config.js
  echo "==> تم إعادة التشغيل بنجاح."
else
  echo "==> pm2 غير مشغّل للمشروع. تشغيل لأول مرة..."
  pm2 start ecosystem.config.js
  pm2 save
  echo "==> تم التشغيل. نفّذ: pm2 startup (للتشغيل بعد إعادة تشغيل السيرفر)"
fi

echo "==> انتهى التحديث."
echo ""
echo "ملاحظة: لو غيّرت مفاتيح (.env) على جهازك، انسخ .env للسيرفر بـ scp ثم أعد تشغيل pm2 (أو عدّل .env هنا بـ nano)."
