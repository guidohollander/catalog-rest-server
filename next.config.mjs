/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure standalone output
  output: 'standalone',
  experimental: {
    // Enable all features needed for standalone mode
    outputFileTracingRoot: process.cwd(),
  },
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
};

export default nextConfig;
