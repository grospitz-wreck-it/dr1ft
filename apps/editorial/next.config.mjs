/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3003",
        "*.app.github.dev",
      ],
    },
  },
};

export default nextConfig;