/**
 * تشغيل / تهيئة رقم واتساب في النظام
 * الاستخدام: node start-phone.js [رقم]
 * مثال: node start-phone.js 01003778273
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

function normalizePhone(input) {
  const digits = String(input).replace(/\D/g, '');
  if (digits.startsWith('01')) return '2' + digits; // مصر: 01xxx -> 201xxx
  if (digits.startsWith('1') && digits.length <= 10) return '2' + digits;
  return digits.startsWith('2') ? digits : '2' + digits;
}

async function main() {
  const raw = process.argv[2] || '01003778273';
  const phone = normalizePhone(raw);
  const phoneVariants = [
    phone,
    phone.replace(/^2/, '0'),
    '+' + phone,
    '0' + phone.replace(/^2/, '')
  ];

  console.log('🔍 جاري البحث عن الحساب:', raw, '→', phone);

  let account = await prisma.whatsAppAccount.findFirst({
    where: {
      OR: phoneVariants.map(p => ({ phone: p }))
    }
  });

  if (!account) {
    console.log('📌 الحساب غير موجود، جاري الإنشاء...');
    account = await prisma.whatsAppAccount.create({
      data: {
        name: 'حساب ' + phone,
        phone: phone.startsWith('+') ? phone : '+' + phone,
        provider: 'whatsapp-web.js',
        status: 'DISCONNECTED'
      }
    });
    console.log('✅ تم إنشاء الحساب:', account.id);
  } else {
    console.log('✅ الحساب موجود:', account.id, '-', account.name);
  }

  console.log('🔄 جاري تهيئة الرقم في خدمة الواتساب...');

  try {
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/initialize/${account.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: account.phone || phone, force: true })
    });
    const data = await res.json();

    if (!data.success) {
      console.error('❌ فشل التشغيل:', data.error || res.status);
      process.exit(1);
    }

    console.log('✅ تم بدء تهيئة الحساب.');
    console.log('');
    console.log('📱 لربط الرقم:');
    console.log('   1. افتح في المتصفح: http://localhost:3000/whatsapp');
    console.log('   2. أو افتح ملف: qr-display.html');
    console.log('   3. امسح رمز QR من واتساب على الموبايل (الأجهزة المرتبطة ← ربط جهاز)');
    console.log('');
    console.log('   معرف الحساب:', account.id);
  } catch (err) {
    console.error('❌ خطأ في الاتصال بخدمة الواتساب:', err.message);
    console.log('   تأكد أن الخدمة شغالة: npm run dev أو node whatsapp-service/server-multi.js');
    process.exit(1);
  }
}

main()
  .finally(() => prisma.$disconnect());
