/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output as standalone for better Docker support
  output: 'standalone',

  // Optimize images
  images: {
    unoptimized: false,
    minimumCacheTTL: 60,
  },

  // Disable powered by header
  poweredByHeader: false,

  // Configure external packages
  serverExternalPackages: ['fs', 'path'],

  // Disable telemetry for better performance
  typescript: {
    ignoreBuildErrors: false,
  },

  // Enable gzip compression
  compress: true,

  // Cache build output
  generateBuildId: async () => {
    return process.env.NEXT_PUBLIC_APP_VERSION || 'development'
  },

  // Strict mode for better development
  reactStrictMode: true,

  productionBrowserSourceMaps: false,
  
  // Enable CORS for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}

export default nextConfig
