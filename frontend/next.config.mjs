/** @type {import('next').NextConfig} */

// FastAPI backend that /api/* is forwarded to (admin: drafts, uploads, AI).
// Read at build time: on Amplify, set BACKEND_URL in the console and redeploy.
// The public pages (home, gallery, blogs) never call it.
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/+$/, "");

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
