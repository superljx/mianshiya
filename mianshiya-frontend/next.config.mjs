/** @type {import('next').NextConfig} */
const backendOrigin = process.env.BACKEND_ORIGIN || "http://localhost:9166";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
