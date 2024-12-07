/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Configure standalone output
  output: 'standalone',
  
  // Optimize build performance
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
  
  // Customize server configuration
  serverRuntimeConfig: {
    port: process.env.PORT || 3000,
  },
  
  // Webpack configuration for optimization
  webpack: (config, { isServer }) => {
    // Minimize server bundle
    if (isServer) {
      config.optimization.minimize = true;
    }
    
    return config;
  },
  
  // Compress static assets
  compress: true,
  
  // Disable telemetry
  telemetry: false
};

export default nextConfig;
