import { Manrope, Inter } from "next/font/google"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Handshake,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Scale,
  Search,
  ShieldCheck,
  Truck,
  KeyRound,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LandingNav } from "@/components/landing/landing-nav"
import { LandingExplorer } from "@/components/landing/landing-explorer"

// Polices de marque limitées à cette page (CLAUDE.md §10 : Manrope pour
// les titres, Inter pour le corps), sans toucher au layout du dashboard.
const manrope = Manrope({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-display" })
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" })

// Coordonnées de l'agence (clé `company.info` des Paramètres), dupliquées
// ici : la page est publique et `/api/settings` exige une permission.
const COMPANY = {
  name: "Nyumbani Express",
  phone: "+243 977 103 143",
  whatsapp: "243977103143",
  address: "22 Av. Résidence, en face de Gardaworld, Bukavu, Sud-Kivu, RDC",
  email: "contact@nbnexpress.org",
}

const whatsappHref = (message: string) => `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(message)}`

const SERVICES = [
  {
    icon: Home,
    title: "Location",
    description:
      "Appartements, maisons, chambrettes, bureaux et locaux commerciaux, en courte ou longue durée, avec un accompagnement jusqu'à l'installation.",
  },
  {
    icon: Building2,
    title: "Vente",
    description: "Maisons et terrains sélectionnés et vérifiés, de la première visite jusqu'à la signature.",
  },
  {
    icon: Scale,
    title: "Conseil immobilier",
    description: "Estimation, mise en valeur d'un bien, conseils juridiques et pratiques pour louer, vendre ou investir.",
  },
  {
    icon: Truck,
    title: "Accueil et déménagement",
    description: "Prise en charge des nouveaux arrivants à Bukavu : recherche de logement, installation et logistique.",
  },
]

const STEPS = [
  {
    icon: ClipboardList,
    title: "Vous décrivez votre recherche",
    description: "En deux minutes, depuis votre téléphone : type de bien, quartier, budget et date d'entrée.",
  },
  {
    icon: Search,
    title: "Nous sélectionnons pour vous",
    description: "Un conseiller vous envoie sur WhatsApp les biens vérifiés qui correspondent, photos à l'appui.",
  },
  {
    icon: KeyRound,
    title: "Visite, accord, remise des clés",
    description: "Nous organisons les visites, accompagnons la négociation et suivons votre installation.",
  },
]

const TRUST_POINTS = [
  { icon: MapPin, title: "Ancrage local", description: "Une équipe sur le terrain qui connaît chaque quartier de Bukavu." },
  {
    icon: MessageCircle,
    title: "Réponse rapide",
    description: "Contact direct avec un conseiller, photos et vidéos envoyées sur WhatsApp.",
  },
  {
    icon: ShieldCheck,
    title: "Biens vérifiés",
    description: "Chaque propriété est visitée et évaluée avant d'être proposée.",
  },
  {
    icon: Handshake,
    title: "Un seul interlocuteur",
    description: "De la première visite à la remise des clés, le même conseiller suit votre dossier.",
  },
]

export default function LandingPage() {
  return (
    <div
      className={`${manrope.variable} ${inter.variable} min-h-screen bg-white font-[family-name:var(--font-body)] text-neutral-900 dark:bg-[#0f1726] dark:text-white`}
    >
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-primary-900"
      >
        Aller au contenu
      </a>

      {/* Hero : photo pleine largeur dans un cadre arrondi, navigation vitrée */}
      <header className="px-2 pt-2 sm:px-3 sm:pt-3 md:px-5 md:pt-5">
        <div className="relative isolate overflow-hidden rounded-[24px] md:rounded-[32px]">
          <Image
            src="/modern-real-estate-property-in-africa.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover"
          />
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-900/95 via-primary-900/75 to-primary-900/20"
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-primary-900/80 to-transparent" aria-hidden />

          <div className="px-3 pt-3 sm:px-5 sm:pt-5">
            <LandingNav phone={COMPANY.phone} />
          </div>

          <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-32 pt-14 sm:pb-36 md:px-6 md:pt-20 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:pb-44">
            <div className="space-y-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-500" aria-hidden />
                Agence immobilière à Bukavu
              </span>
              <h1 className="font-[family-name:var(--font-display)] text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4.25rem]">
                Trouvez le{" "}
                <span className="whitespace-nowrap rounded-xl bg-white px-2.5 text-primary-900 [box-decoration-break:clone]">
                  logement idéal
                </span>{" "}
                pour votre budget.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                Louer, acheter, vendre ou vous installer : Nyumbani Express vous accompagne avec une équipe locale qui
                connaît chaque quartier du Sud-Kivu.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/demande-location"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-600 px-6 text-base font-semibold text-white shadow-lg shadow-black/20 transition-colors hover:bg-[#a83608] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <ClipboardList className="h-5 w-5" aria-hidden />
                  Faire une demande de location
                </Link>
                <a
                  href={whatsappHref("Bonjour, je recherche un bien avec Nyumbani Express.")}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden />
                  Discuter sur WhatsApp
                </a>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
                {["Location", "Vente", "Conseil", "Déménagement"].map((label) => (
                  <li key={label} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent-500" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Carte vitrée flottante */}
            <div className="hidden justify-end lg:flex">
              <figure className="w-full max-w-sm rounded-3xl border border-white/25 bg-white/15 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                  <Image
                    src="/house-bukavu-ibanda.jpg"
                    alt="Maison à Ibanda, Bukavu"
                    fill
                    sizes="384px"
                    className="object-cover"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-primary-900">
                    Visité par l&apos;équipe
                  </span>
                </div>
                <figcaption className="flex items-center justify-between gap-3 px-2 pb-1 pt-3 text-white">
                  <span>
                    <span className="block font-[family-name:var(--font-display)] font-semibold">Maison à Ibanda</span>
                    <span className="flex items-center gap-1 text-sm text-white/75">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      Bukavu, Sud-Kivu
                    </span>
                  </span>
                  <span className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-primary-900">Sur demande</span>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </header>

      <main id="contenu">
        <LandingExplorer whatsapp={COMPANY.whatsapp} />

        {/* Services */}
        <section id="services" className="scroll-mt-6 bg-neutral-100 py-16 md:py-24 dark:bg-white/[0.03]" aria-labelledby="services-title">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="mx-auto mb-12 max-w-2xl space-y-3 text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-600 dark:text-accent-500">
                Nos services
              </span>
              <h2
                id="services-title"
                className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Un accompagnement immobilier complet
              </h2>
              <p className="text-base leading-relaxed text-neutral-600 dark:text-white/70">
                Du premier contact à l&apos;installation, nous couvrons l&apos;ensemble de vos besoins à Bukavu.
              </p>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {SERVICES.map((service) => (
                <li
                  key={service.title}
                  className="group rounded-2xl border border-neutral-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-[#1b2433]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-900 text-white transition-colors group-hover:bg-accent-600">
                    <service.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="mt-5 font-[family-name:var(--font-display)] text-lg font-semibold">{service.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-white/70">{service.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="etapes" className="scroll-mt-6 py-16 md:py-24" aria-labelledby="etapes-title">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="mb-12 max-w-2xl space-y-3">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-600 dark:text-accent-500">
                Comment ça marche
              </span>
              <h2 id="etapes-title" className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
                Trois étapes vers votre nouveau logement
              </h2>
            </div>
            <ol className="grid gap-5 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="relative rounded-2xl border border-neutral-200 p-6 dark:border-white/10"
                >
                  <span
                    className="font-[family-name:var(--font-display)] text-5xl font-extrabold text-primary-900/10 dark:text-white/10"
                    aria-hidden
                  >
                    0{index + 1}
                  </span>
                  <span className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-500">
                    <step.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold">
                    <span className="sr-only">Étape {index + 1} : </span>
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-white/70">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pourquoi nous */}
        <section id="apropos" className="scroll-mt-6 pb-16 md:pb-24" aria-labelledby="apropos-title">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 md:px-6 lg:grid-cols-2 lg:items-center">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl lg:aspect-[5/6]">
              <Image
                src="/durable-house-sale-bukavu.jpg"
                alt="Maison vérifiée par Nyumbani Express à Bukavu"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl border border-white/25 bg-primary-900/80 p-4 text-white backdrop-blur-md">
                <Clock className="h-5 w-5 shrink-0 text-accent-500" aria-hidden />
                <p className="text-sm">Une équipe disponible tous les jours ouvrables pour répondre à vos demandes.</p>
              </div>
            </div>
            <div className="space-y-6">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-600 dark:text-accent-500">
                Pourquoi Nyumbani Express
              </span>
              <h2 id="apropos-title" className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
                La crédibilité au service de votre projet immobilier
              </h2>
              <p className="text-base leading-relaxed text-neutral-600 dark:text-white/70">
                Nous connaissons le terrain : les quartiers, les prix réels du marché, les démarches locales. Chaque client
                est accompagné personnellement, du premier échange jusqu&apos;à l&apos;installation.
              </p>
              <ul className="grid gap-4 sm:grid-cols-2">
                {TRUST_POINTS.map((point) => (
                  <li key={point.title} className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-600/10 text-secondary-600 dark:bg-white/10 dark:text-white">
                      <point.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block font-semibold">{point.title}</span>
                      <span className="block text-sm leading-relaxed text-neutral-600 dark:text-white/70">
                        {point.description}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Appel à l'action */}
        <section className="px-2 pb-2 sm:px-3 md:px-5" aria-labelledby="cta-title">
          <div className="relative isolate overflow-hidden rounded-[24px] bg-primary-900 px-6 py-14 text-center md:rounded-[32px] md:py-20">
            <div
              className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl"
              aria-hidden
            />
            <div className="absolute -bottom-24 -left-24 -z-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden />
            <h2
              id="cta-title"
              className="mx-auto max-w-2xl font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Prêt à trouver votre prochain logement ?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/80">
              Décrivez votre recherche ou écrivez-nous : un conseiller vous répond sur WhatsApp ou par téléphone.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/demande-location"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-600 px-6 font-semibold text-white hover:bg-[#a83608]"
              >
                <ClipboardList className="h-5 w-5" aria-hidden />
                Faire une demande de location
              </Link>
              <a
                href={whatsappHref("Bonjour, je souhaite discuter d'un projet immobilier avec Nyumbani Express.")}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 px-6 font-semibold text-white hover:bg-white/10"
              >
                <MessageCircle className="h-5 w-5" aria-hidden />
                Discuter sur WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="scroll-mt-6 py-14" aria-labelledby="contact-title">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Image src="/nyumbani-logo.png" alt="" width={40} height={40} className="h-10 w-10 rounded-lg" />
                <span className="font-[family-name:var(--font-display)] text-lg font-bold">Nyumbani Express</span>
              </div>
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-white/70">
                Agence immobilière : location, vente, conseil et accompagnement à Bukavu, Sud-Kivu, RDC.
              </p>
              <ThemeToggle />
            </div>
            <nav aria-label="Services" className="space-y-3">
              <h3 className="text-sm font-semibold">Services</h3>
              <ul className="space-y-2 text-sm text-neutral-600 dark:text-white/70">
                {SERVICES.map((service) => (
                  <li key={service.title}>
                    <a href="#services" className="hover:text-accent-600">
                      {service.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Agence" className="space-y-3">
              <h3 className="text-sm font-semibold">Agence</h3>
              <ul className="space-y-2 text-sm text-neutral-600 dark:text-white/70">
                <li>
                  <a href="#biens" className="hover:text-accent-600">
                    Nos biens
                  </a>
                </li>
                <li>
                  <Link href="/demande-location" className="hover:text-accent-600">
                    Demande de location
                  </Link>
                </li>
                <li>
                  <Link href="/collecte-bien" className="hover:text-accent-600">
                    Confier un bien
                  </Link>
                </li>
                <li>
                  <Link href="/auth/login" className="hover:text-accent-600">
                    Espace équipe
                  </Link>
                </li>
              </ul>
            </nav>
            <div className="space-y-3">
              <h3 id="contact-title" className="text-sm font-semibold">
                Contact
              </h3>
              <ul className="space-y-3 text-sm text-neutral-600 dark:text-white/70">
                <li className="flex gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />
                  {COMPANY.address}
                </li>
                <li>
                  <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} className="flex gap-2.5 hover:text-accent-600">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />
                    {COMPANY.phone}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${COMPANY.email}`} className="flex gap-2.5 hover:text-accent-600">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />
                    {COMPANY.email}
                  </a>
                </li>
                <li>
                  <a
                    href={whatsappHref("Bonjour Nyumbani Express.")}
                    className="inline-flex items-center gap-1.5 font-semibold text-primary-900 hover:text-accent-600 dark:text-white"
                  >
                    Écrire sur WhatsApp
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-12 border-t border-neutral-200 pt-6 text-center text-sm text-neutral-600 dark:border-white/10 dark:text-white/60">
            &copy; {new Date().getFullYear()} {COMPANY.name}. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  )
}
