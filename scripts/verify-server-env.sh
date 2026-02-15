#!/usr/bin/env bash
# تحقق من أن .env على السيرفر يحتوي القيم المطلوبة للنشر (صور المحادثات + واتساب)
# التشغيل: على السيرفر: cd ~/MerasNode && bash scripts/verify-server-env.sh

set -e
cd "$(dirname "$0")/.."

echo "==> التحقق من .env..."
missing=""

if [ ! -f .env ]; then
  echo "❌ لا يوجد ملف .env. انسخ من .env.example: cp .env.example .env ثم عدّل القيم."
  exit 1
fi

grep -q "NEXT_PUBLIC_APP_URL=https://meraschat.com" .env 2>/dev/null || missing="$missing NEXT_PUBLIC_APP_URL=https://meraschat.com"
grep -q "NEXT_APP_URL=https://meraschat.com" .env 2>/dev/null || missing="$missing NEXT_APP_URL=https://meraschat.com"

if [ -n "$missing" ]; then
  echo "⚠️  أضف في .env السطور التالية ثم أعد البناء والتشغيل:"
  echo "   NEXT_PUBLIC_APP_URL=https://meraschat.com"
  echo "   NEXT_APP_URL=https://meraschat.com"
  echo ""
  echo "   ثم: npm run build && pm2 restart ecosystem.config.js"
  exit 1
fi

echo "✅ .env يحتوي NEXT_PUBLIC_APP_URL و NEXT_APP_URL لـ meraschat.com"
echo ""
echo "لو غيّرت .env الآن، نفّذ: ./scripts/deploy-on-ec2.sh"
