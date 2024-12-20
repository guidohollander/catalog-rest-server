/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    optimizeCss: true,
  },
  webpack: (config, { dev, isServer }) => {
    // Only run CSS optimization in production and when not running on the server
    if (!dev && !isServer) {
      config.optimization.minimize = true;
    }
    return config;
  },
}

module.exports = nextConfig
