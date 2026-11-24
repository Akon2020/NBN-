/** @type {import('next').NextConfig} */
const nextConfig = {
  // HSTS : une fois venu en HTTPS, le navigateur (Safari iOS compris)
  // n'essaie plus jamais la version http:// du site. Sans includeSubDomains
  // pour ne pas contraindre les autres services du domaine (webmail).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Strict-Transport-Security", value: "max-age=31536000" }],
      },
    ];
  },
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
