/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
  },

  // Next.js 16: استخدام Turbopack بدون webpack لتجنب خطأ الـ build
  turbopack: {},

  // Exclude WhatsApp packages from server bundles
  serverExternalPackages: [
    'whatsapp-web.js',
    'qrcode-terminal',
    'puppeteer',
    'puppeteer-core',
    '@prisma/client',
    'bcryptjs'
  ],
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
}

export default nextConfig
