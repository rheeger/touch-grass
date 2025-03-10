/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['maps.googleapis.com'],
  },
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    NEXT_PUBLIC_EAS_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_EAS_CONTRACT_ADDRESS,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_PAYMASTER_RPC_URL: process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL,
  },
  // Optimize development experience
  webpack: (config, { dev, isServer }) => {
    // Reduce console noise in development
    if (dev && !isServer) {
      config.infrastructureLogging = {
        level: 'error',
      };
    }
    return config;
  },
  // Suppress specific development warnings
  onDemandEntries: {
    // Reduce the number of parallel compilation threads
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 2,
  }
};

module.exports = nextConfig; 