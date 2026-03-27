// Fix Offer.imageUrl to use HTTPS domain instead of old HTTP IP/localhost
// Usage (على السيرفر أو محلياً مع نفس قاعدة البيانات):
//   node scripts/fix-offer-images.js
//
// سكربت آمن يستخدم Prisma (بدون SQL Raw) و:
// - يقرأ كل العروض اللي ليها imageUrl
// - لو الرابط بادئ بـ http://100.24.75.110:3000 أو http://localhost:3000
//   يستبدل الجزء ده بـ baseUrl (مثلاً https://meraschat.com)

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const baseUrl =
    (process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "").replace(/\/+$/, "") || "https://meraschat.com";

  const OLD_PREFIXES = [
    "http://100.24.75.110:3000",
    "http://localhost:3000",
  ];

  console.log("==> Fixing Offer.imageUrl");
  console.log("Base URL:", baseUrl);
  console.log("Old prefixes:", OLD_PREFIXES.join(", "));

  const offers = await prisma.offer.findMany({
    where: {
      imageUrl: {
        not: null,
      },
    },
    select: {
      id: true,
      imageUrl: true,
    },
  });

  let updatedCount = 0;

  for (const offer of offers) {
    const url = offer.imageUrl;
    if (typeof url !== "string") continue;

    const prefix = OLD_PREFIXES.find((p) => url.startsWith(p + "/"));
    if (!prefix) continue;

    const newUrl = baseUrl + url.substring(prefix.length);
    if (newUrl === url) continue;

    await prisma.offer.update({
      where: { id: offer.id },
      data: { imageUrl: newUrl },
    });
    updatedCount++;
  }

  console.log(`✅ Done. Updated ${updatedCount} offers.`);
}

main()
  .catch((err) => {
    console.error("Error fixing offer images:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

