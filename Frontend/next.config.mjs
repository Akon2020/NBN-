/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Les images de biens sont servies par le Backend (uploads/images, cf.
    // app.js) sur une origine distincte du Frontend — jamais unoptimized
    // (SEC-G01/ADMIN-G01, contrainte RDC de bande passante faible,
    // CLAUDE.md §1). L'hôte de production n'est pas encore connu
    // (CLAUDE.md §16 point 1, hébergement cPanel) ; à ajouter ici dès qu'il
    // sera arrêté.
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5500",
        pathname: "/uploads/**",
      },
    ],
  },
}

export default nextConfig
