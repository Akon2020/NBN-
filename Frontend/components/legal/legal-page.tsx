import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Manrope, Inter } from "next/font/google"
import { ThemeToggle } from "@/components/theme-toggle"
import { BackButton } from "@/components/back-button"
import { COMPANY, LEGAL_LINKS } from "@/lib/company"

const manrope = Manrope({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display" })
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" })

type Section = { id: string; title: string; content: ReactNode }

type Props = {
  title: string
  intro: ReactNode
  updatedAt: string
  sections: Section[]
}

// Gabarit commun des pages d'information (confidentialité, conditions,
// mentions légales) : sommaire cliquable, lecture confortable sur téléphone.
export function LegalPage({ title, intro, updatedAt, sections }: Props) {
  return (
    <div className={`${manrope.variable} ${inter.variable} min-h-screen bg-background font-[family-name:var(--font-body)]`}>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-1">
            <BackButton />
            <Link href="/" className="hidden items-center gap-2 sm:flex" aria-label="Nyumbani Express, accueil">
              <Image src="/nyumbani-logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-lg" />
              <span className="font-[family-name:var(--font-display)] font-bold">Nyumbani Express</span>
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main id="contenu" className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
        <div className="max-w-3xl space-y-3">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="text-sm text-muted-foreground">Dernière mise à jour : {updatedAt}</p>
          <div className="text-base leading-relaxed text-muted-foreground">{intro}</div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Sommaire" className="lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sommaire</p>
            <ol className="space-y-1 text-sm">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="block rounded-md px-2 py-1.5 hover:bg-muted hover:text-foreground">
                    {index + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="max-w-3xl space-y-10">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-24 space-y-3" aria-labelledby={`${section.id}-title`}>
                <h2 id={`${section.id}-title`} className="font-[family-name:var(--font-display)] text-xl font-semibold">
                  {index + 1}. {section.title}
                </h2>
                <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:space-y-1.5">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-6">
          <p>
            &copy; {new Date().getFullYear()} {COMPANY.name}. Tous droits réservés.
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  )
}
