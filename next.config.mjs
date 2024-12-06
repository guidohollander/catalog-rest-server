/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure standalone output
  output: 'standalone',
  // Optional: specify output file tracing root if needed
  outputFileTracingRoot: process.cwd(),
  
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

  // Ensure the server listens on the correct port
  serverRuntimeConfig: {
    port: process.env.PORT || 3000,
  },
};

export default nextConfig;
