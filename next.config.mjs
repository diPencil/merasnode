/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
  },

  // Next.js 16: تجنب تعارض Turbopack مع webpack
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
  // Turbopack configuration
  experimental: {
    // Optimize for better performance
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Webpack fallback for better compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
}

export default nextConfig
