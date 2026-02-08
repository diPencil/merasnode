/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
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
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
      resolveExtensions: [
        '.mdx',
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.mjs',
        '.json',
      ],
    },
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
