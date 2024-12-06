/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure standalone output
  output: 'standalone',
  
  // Enable CORS for API routes
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  
  // Optional: Add webpack configuration if needed
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure critical dependencies are not excluded
      config.resolve.fallback = { 
        ...config.resolve.fallback, 
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  // Customize server configuration
  serverRuntimeConfig: {
    port: process.env.PORT || 3000,
  },

  // Customize HTTP server
  httpAgentOptions: {
    keepAlive: true,
  },
};

export default nextConfig;
