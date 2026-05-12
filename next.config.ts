/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone build produces a self-contained server.js + minimal node_modules
  // copy in .next/standalone/, which is what the production NSSM service runs.
  // Without this, `next start` requires the full node_modules tree in the
  // deploy directory.
  output: "standalone",
  images: {
    domains: ['s.gravatar.com'],
  },
};

export default nextConfig;
