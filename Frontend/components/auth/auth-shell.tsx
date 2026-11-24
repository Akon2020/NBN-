import type React from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { Manrope } from "next/font/google"
import { ThemeToggle } from "@/components/theme-toggle"

const manrope = Manrope({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display" })

type Props = {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
}

// Cadre des écrans de connexion : photo de marque à gauche sur grand écran,
// formulaire seul et pleine largeur sur téléphone (aucun élément décoratif
// à charger avant de pouvoir se connecter sur une connexion faible).
export function AuthShell({ title, description, children }: Props) {
  return (
    <div className={`${manrope.variable} min-h-dvh bg-background lg:grid lg:grid-cols-[1.05fr_1fr]`}>
      <aside className="relative hidden overflow-hidden p-5 lg:block" aria-hidden>
        <div className="relative h-full overflow-hidden rounded-[28px]">
          <Image
            src="/modern-real-estate-property-in-africa.jpg"
            alt=""
            fill
            sizes="50vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-900/95 via-primary-900/55 to-primary-900/20" />
          <div className="absolute left-6 top-6 flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-xl">
            <Image src="/nyumbani-logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-lg" />
            <span className="font-[family-name:var(--font-display)] font-bold text-white">Nyumbani Express</span>
          </div>
          <div className="absolute inset-x-6 bottom-6 space-y-4 rounded-2xl border border-white/20 bg-white/10 p-6 text-white backdrop-blur-xl">
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight">
              La crédibilité au service de votre projet immobilier.
            </p>
            <p className="flex items-center gap-2 text-sm text-white/80">
              <ShieldCheck className="h-4 w-4 text-accent-500" />
              Espace réservé à l&apos;équipe et aux partenaires NBN Express.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Accueil
          </Link>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
          <div className="mb-8 space-y-3">
            <Image src="/nyumbani-logo.png" alt="Nyumbani Express" width={48} height={48} className="h-12 w-12 rounded-xl lg:hidden" />
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">{title}</h1>
            {description && <div className="text-muted-foreground">{description}</div>}
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

// Champ de saisie aux dimensions tactiles (48 px) et à 16 px de police :
// en dessous, Safari iOS zoome sur le champ à chaque saisie.
export const authInputClass =
  "h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition-shadow focus:border-primary-900 focus:ring-2 focus:ring-primary-900/20 disabled:opacity-60 dark:focus:border-white/40"

export const authButtonClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-900 px-4 text-base font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60 dark:bg-white dark:text-primary-900 dark:hover:bg-white/90"
