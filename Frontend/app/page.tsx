import { Manrope, Inter } from "next/font/google"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Building2,
  Home,
  Scale,
  Truck,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Clock,
  Handshake,
  ArrowRight,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

// GOAL 17 — polices de marque scopées à cette page uniquement (CLAUDE.md
// §10 : Manrope pour les titres, Inter pour le corps), sans toucher au
// layout racine ni à `--font-sans` global qui pilote déjà tout le dashboard
// existant — même logique de coexistence que les tokens `primary-900`/
// `accent-600`/`secondary-600` (déjà déclarés dans globals.css, jusqu'ici
// jamais consommés par un écran réel).
const manrope = Manrope({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" })
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" })

// Coordonnées réelles de l'agence (Backend/migrations/20260719900000-create-app-settings.cjs,
// clé `company.info`) — dupliquées ici en statique volontairement : cette
// page est publique et non authentifiée, `/api/settings` reste réservé à
// `settings:read` (CLAUDE.md §2).
const COMPANY = {
  name: "Nyumbani Express",
  phone: "+243 999 000 111",
  whatsapp: "243999000111",
  address: "Avenue de la Paix, Bukavu, Sud-Kivu, RDC",
  email: "contact@nyumbani.cd",
}

const whatsappHref = (message: string) =>
  `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(message)}`

const SERVICES = [
  {
    icon: Home,
    title: "Location",
    description:
      "Appartements, maisons et parcelles à louer à Bukavu — courte ou longue durée, avec accompagnement complet jusqu'à l'installation.",
  },
  {
    icon: Building2,
    title: "Vente",
    description:
      "Biens à vendre sélectionnés et vérifiés — accompagnement de la visite jusqu'à la transaction, en toute transparence.",
  },
  {
    icon: Scale,
    title: "Conseil immobilier",
    description:
      "Estimation, mise en valeur d'un bien, conseils juridiques et pratiques pour vendre, louer ou investir sereinement.",
  },
  {
    icon: Truck,
    title: "Accueil & déménagement",
    description:
      "Prise en charge des nouveaux arrivants à Bukavu — recherche de logement, installation et accompagnement logistique.",
  },
]

const TRUST_POINTS = [
  {
    icon: MapPin,
    title: "Ancrage local",
    description: "Une équipe présente sur le terrain à Bukavu, qui connaît chaque quartier du Sud-Kivu.",
  },
  {
    icon: MessageCircle,
    title: "Réponse rapide sur WhatsApp",
    description: "Contact direct avec un conseiller, photos et détails du bien envoyés immédiatement.",
  },
  {
    icon: ShieldCheck,
    title: "Biens vérifiés",
    description: "Chaque propriété présentée est visitée et évaluée par notre équipe avant d'être proposée.",
  },
  {
    icon: Handshake,
    title: "Accompagnement de bout en bout",
    description: "De la première visite à la remise des clés, un seul interlocuteur suit votre dossier.",
  },
]

const SHOWCASE_IMAGES = [
  { src: "/modern-apartment-bukavu.jpg", alt: "Appartement moderne à Bukavu" },
  { src: "/house-bukavu-ibanda.jpg", alt: "Maison à Ibanda, Bukavu" },
  { src: "/durable-house-sale-bukavu.jpg", alt: "Maison en construction durable à vendre" },
  { src: "/flat-land-plot-bukavu.jpg", alt: "Terrain plat disponible à Bukavu" },
]

export default function LandingPage() {
  return (
    <div className={`${manrope.variable} ${inter.variable} min-h-screen font-[family-name:var(--font-body)]`}>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/nyumbani-logo.png" alt="Nyumbani Express" width={120} height={40} className="h-10 w-auto" />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="#services" className="text-sm font-medium text-foreground hover:text-accent-600 transition-colors">
              Services
            </Link>
            <Link href="#apropos" className="text-sm font-medium text-foreground hover:text-accent-600 transition-colors">
              À propos
            </Link>
            <Link href="#contact" className="text-sm font-medium text-foreground hover:text-accent-600 transition-colors">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" className="hidden md:inline-flex">
              <Link href="/auth/login">Espace équipe</Link>
            </Button>
            <Button asChild className="bg-accent-600 text-white hover:bg-accent-600/90">
              <a href={whatsappHref("Bonjour, je souhaite être mis en relation avec un conseiller Nyumbani Express.")}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Nous contacter
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary-900">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-900 to-primary-700 opacity-95" />
        <div className="container relative mx-auto px-4 py-20 md:px-6 md:py-32">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div className="flex flex-col justify-center space-y-8">
              <div className="space-y-4">
                <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white">
                  Agence immobilière — Bukavu, Sud-Kivu
                </span>
                <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-balance text-white sm:text-5xl md:text-6xl">
                  Votre <span className="text-accent-500">prochain chez-vous</span> commence ici
                </h1>
                <p className="text-lg text-white/80 text-pretty leading-relaxed md:text-xl">
                  Nyumbani Express accompagne particuliers et familles à Bukavu pour louer, vendre, acheter ou
                  s&apos;installer — avec une équipe locale qui connaît chaque quartier.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 bg-accent-600 px-8 text-white hover:bg-accent-600/90">
                  <a href={whatsappHref("Bonjour, je recherche un bien avec Nyumbani Express.")}>
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Discuter sur WhatsApp
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 border-white/30 bg-transparent px-8 text-white hover:bg-white/10 hover:text-white">
                  <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}>
                    <Phone className="mr-2 h-5 w-5" />
                    {COMPANY.phone}
                  </a>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-6 pt-4">
                {["Location", "Vente", "Conseil", "Déménagement"].map((label) => (
                  <div key={label} className="flex items-center gap-2 text-white/90">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent-500" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative lg:h-[560px]">
              <div className="grid h-full grid-cols-2 gap-4">
                <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                  <Image src="/modern-apartment-bukavu.jpg" alt="Appartement moderne à Bukavu" fill className="object-cover" priority />
                </div>
                <div className="flex flex-col gap-4">
                  <div className="relative flex-1 overflow-hidden rounded-2xl shadow-2xl">
                    <Image src="/house-bukavu-ibanda.jpg" alt="Maison à Ibanda, Bukavu" fill className="object-cover" />
                  </div>
                  <div className="relative flex-1 overflow-hidden rounded-2xl shadow-2xl">
                    <Image src="/flat-land-plot-bukavu.jpg" alt="Terrain plat à Bukavu" fill className="object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="border-b border-border py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center space-y-4 mb-16">
            <span className="text-sm font-semibold uppercase tracking-wide text-accent-600">Nos services</span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
              Un accompagnement immobilier complet
            </h2>
            <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
              Du premier contact à l&apos;installation, Nyumbani Express couvre l&apos;ensemble de vos besoins immobiliers à
              Bukavu
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((service) => (
              <Card key={service.title} className="border-border bg-card">
                <CardContent className="p-6 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-900/10">
                    <service.icon className="h-6 w-6 text-primary-900" />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold">{service.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section className="border-b border-border py-20 md:py-32 bg-neutral-100 dark:bg-muted">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center space-y-4 mb-12">
            <span className="text-sm font-semibold uppercase tracking-wide text-accent-600">Nos biens</span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
              Une sélection de propriétés à Bukavu
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SHOWCASE_IMAGES.map((image) => (
              <div key={image.src} className="group relative aspect-[4/5] overflow-hidden rounded-xl shadow-md">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-900/70 via-transparent to-transparent" />
                <p className="absolute bottom-3 left-3 right-3 text-sm font-medium text-white">{image.alt}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button asChild variant="outline" className="border-primary-900 text-primary-900 hover:bg-primary-900 hover:text-white dark:border-white dark:text-white">
              <a href={whatsappHref("Bonjour, pouvez-vous m'envoyer la liste actuelle des biens disponibles ?")}>
                Voir plus de biens sur WhatsApp
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="apropos" className="border-b border-border py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <span className="text-sm font-semibold uppercase tracking-wide text-accent-600">Pourquoi Nyumbani Express</span>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
                Une agence de confiance, ancrée à Bukavu
              </h2>
              <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
                Nous connaissons le terrain : les quartiers, les prix réels du marché, les démarches locales. Notre
                équipe accompagne chaque client personnellement, du premier échange sur WhatsApp jusqu&apos;à
                l&apos;installation dans le nouveau logement.
              </p>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <Clock className="h-5 w-5 shrink-0 text-secondary-600" />
                <p className="text-sm text-muted-foreground">
                  Une équipe disponible pour répondre rapidement à vos demandes, tous les jours ouvrables.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {TRUST_POINTS.map((point) => (
                <Card key={point.title} className="border-border bg-card">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-600/10">
                      <point.icon className="h-5 w-5 text-secondary-600" />
                    </div>
                    <h3 className="font-semibold">{point.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-b border-border py-20 md:py-32 bg-primary-900">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center space-y-8">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-balance text-white sm:text-4xl md:text-5xl">
              Prêt à trouver votre prochain logement ?
            </h2>
            <p className="text-lg text-white/80 text-pretty leading-relaxed">
              Contactez notre équipe dès maintenant — un conseiller vous répond directement sur WhatsApp ou par
              téléphone
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="h-12 bg-accent-600 px-8 text-white hover:bg-accent-600/90">
                <a href={whatsappHref("Bonjour, je souhaite discuter d'un projet immobilier avec Nyumbani Express.")}>
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Discuter sur WhatsApp
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 border-white/30 bg-transparent px-8 text-white hover:bg-white/10 hover:text-white">
                <Link href="/auth/login">Accès équipe</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="border-t border-border bg-card py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <Image src="/nyumbani-logo.png" alt="Nyumbani Express" width={120} height={40} className="h-10 w-auto" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Agence immobilière — location, vente, conseil et accompagnement à Bukavu, Sud-Kivu, RDC.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Services</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#services" className="hover:text-accent-600 transition-colors">
                    Location
                  </Link>
                </li>
                <li>
                  <Link href="#services" className="hover:text-accent-600 transition-colors">
                    Vente
                  </Link>
                </li>
                <li>
                  <Link href="#services" className="hover:text-accent-600 transition-colors">
                    Conseil immobilier
                  </Link>
                </li>
                <li>
                  <Link href="#services" className="hover:text-accent-600 transition-colors">
                    Accueil &amp; déménagement
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Agence</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#apropos" className="hover:text-accent-600 transition-colors">
                    À propos
                  </Link>
                </li>
                <li>
                  <Link href="/auth/login" className="hover:text-accent-600 transition-colors">
                    Espace équipe
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{COMPANY.address}</li>
                <li>
                  <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} className="hover:text-accent-600 transition-colors">
                    {COMPANY.phone}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${COMPANY.email}`} className="hover:text-accent-600 transition-colors">
                    {COMPANY.email}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} {COMPANY.name}. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
