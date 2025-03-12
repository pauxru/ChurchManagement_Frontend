/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['s.gravatar.com', 'cdn.auth0.com'],
  },

  async rewrites() {
    return process.env.NODE_ENV === 'development'
      ? [
          {
            source: '/:path*',
            destination: 'http://localhost:3000/:path*',
          },
        ]
      : [];
  },

  async headers() {
    return [
      // Proxy headers for reverse proxy
      {
        source: '/:path*',
        headers: [
          { key: 'X-Forwarded-Proto', value: 'https' },
          { key: 'X-Forwarded-Host', value: 'pawadtech.com' },
        ],
      },
      // CORS headers for API routes
      {
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://pawadtech.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
