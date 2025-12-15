import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

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
      <body className={`font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
