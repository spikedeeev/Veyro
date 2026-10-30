import type { NextConfig } from "next";

const backend = process.env.BACKEND_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  // The browser talks only to this origin, so auth cookies stay same-origin and no CORS is needed
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backend}/:path*` },
      { source: "/uploads/:path*", destination: `${backend}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
