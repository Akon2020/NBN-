import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14294A",
}

export const metadata: Metadata = {
  title: "Nyumbani Express - Trouvez votre maison idéale à Bukavu",
  description: "Plateforme immobilière moderne pour trouver des propriétés à louer et à vendre à Bukavu, Sud-Kivu, RDC",
  icons: {
    icon: [
      {
        url: "/nyumbani-logo.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/nyumbani-logo.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/nyumbani-logo.png",
        type: "image/png",
      },
    ],
    apple: "/nyumbani-logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Filet de sécurité si le proxy ne voit pas le protocole : une page
            servie en http:// ne peut pas parler à l'API (voir proxy.ts). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=window.location;if(l.protocol==="http:"&&!/^(localhost|127\\.|10\\.|192\\.168\\.|172\\.)/.test(l.hostname)){l.replace("https://"+l.host+l.pathname+l.search+l.hash)}})()`,
          }}
        />
      </head>
      <body className={`font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
