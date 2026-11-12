/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "*.app.github.dev",
        "*.preview.app.github.dev",
        "*.githubpreview.dev",
      ],
    },
  },
  allowedDevOrigins: [
    "*.app.github.dev",
    "*.preview.app.github.dev",
    "*.githubpreview.dev",
  ],
};

module.exports = nextConfig;
