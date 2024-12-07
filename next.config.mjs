/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  
  // Enable CORS for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  
  // Development configuration
  webpack: (config, { dev, isServer }) => {
    // Fix module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': config.context,
      '@/src': config.context + '/src'
    };
    
    return config;
  },
  
  // Optimize for production
  compress: true,
};

export default nextConfig;
