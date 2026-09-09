/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.nbnexpress.org",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "10.220.60.73",
        port: "5500",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "5500",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
