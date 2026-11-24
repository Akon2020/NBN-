"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  BedSingle,
  Briefcase,
  Camera,
  ClipboardList,
  Home,
  MapPin,
  Search,
  ShieldCheck,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react"
import { PROPERTY_KINDS } from "@/lib/propertyKinds"
import { BUKAVU_LOCATIONS, quartiersOf, type CommuneCode } from "@/lib/locations"

const COMMUNE_LABELS: Record<CommuneCode, string> = {
  IBANDA: "Ibanda",
  KADUTU: "Kadutu",
  BAGIRA: "Bagira",
}

const BUDGETS = [
  { value: "", label: "Tous les budgets" },
  { value: "100", label: "Jusqu'à 100 $" },
  { value: "250", label: "Jusqu'à 250 $" },
  { value: "500", label: "Jusqu'à 500 $" },
  { value: "1000", label: "Jusqu'à 1 000 $" },
  { value: "5000", label: "Jusqu'à 5 000 $" },
]

const requestHrefFor = (fields: { type?: string; commune?: string; quartier?: string; budgetMax?: string }) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(fields)) if (value) params.set(key, value)
  const query = params.toString()
  return `/demande-location${query ? `?${query}` : ""}`
}

// Vitrine marketing par type de bien : chaque carte ouvre la demande de
// location déjà orientée sur ce type. Aucun bien réel, aucun prix affiché :
// la sélection se fait avec un conseiller.
type Showcase = {
  kind: string
  title: string
  pitch: string
  image?: string
  icon?: LucideIcon
  tone?: string
  span?: string
}

const SHOWCASE: Showcase[] = [
  {
    kind: "MAISON",
    title: "Maisons",
    pitch: "Des maisons familiales avec parcelle, visitées par notre équipe.",
    image: "/house-bukavu-ibanda.jpg",
    span: "sm:col-span-2 lg:row-span-2",
  },
  {
    kind: "APPARTEMENT",
    title: "Appartements",
    pitch: "Au centre-ville ou au calme, meublés ou non.",
    image: "/modern-apartment-bukavu.jpg",
  },
  {
    kind: "TERRAIN",
    title: "Terrains",
    pitch: "Parcelles à bâtir à la vente, visitées par notre équipe.",
    image: "/flat-land-plot-bukavu.jpg",
  },
  {
    kind: "CHAMBRETTE",
    title: "Chambrettes",
    pitch: "Petits budgets, étudiants et premiers logements.",
    icon: BedSingle,
    tone: "bg-primary-900 text-white",
  },
  {
    kind: "BUREAU",
    title: "Bureaux",
    pitch: "Espaces de travail pour entreprises et ONG.",
    icon: Briefcase,
    tone: "bg-secondary-600 text-white",
  },
  {
    kind: "LOCAL_COMMERCIAL",
    title: "Locaux commerciaux",
    pitch: "Boutiques et dépôts sur les axes passants.",
    icon: Store,
    tone: "bg-accent-600 text-white",
    span: "lg:col-span-2",
  },
]

const PROMISES = [
  { icon: ShieldCheck, title: "Visité avant d'être proposé", text: "Notre équipe se rend sur place pour chaque bien." },
  { icon: Camera, title: "Photos et vidéos réelles", text: "Vous voyez le bien tel qu'il est avant de vous déplacer." },
  { icon: Users, title: "Un conseiller dédié", text: "La même personne suit votre dossier jusqu'aux clés." },
]

export function LandingExplorer() {
  const router = useRouter()
  const [kind, setKind] = useState("")
  const [commune, setCommune] = useState("")
  const [quartier, setQuartier] = useState("")
  const [budget, setBudget] = useState("")

  const requestHref = useMemo(
    () => requestHrefFor({ type: kind, commune, quartier, budgetMax: budget }),
    [kind, commune, quartier, budget],
  )

  // La recherche ouvre la demande de location avec les critères déjà remplis.
  const onSearch = (event: React.FormEvent) => {
    event.preventDefault()
    router.push(requestHref)
  }

  const fieldClass =
    "h-12 w-full appearance-none rounded-xl border border-neutral-200 bg-neutral-100 px-3 pr-8 text-sm font-medium text-neutral-900 focus:border-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-900/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
  const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-600 dark:text-white/60"

  return (
    <>
      {/* Barre de recherche posée à cheval sur le bas du hero */}
      <div className="relative z-10 mx-auto -mt-20 max-w-6xl px-3 sm:-mt-16 md:px-6">
        <form
          onSubmit={onSearch}
          role="search"
          aria-label="Décrire le bien recherché"
          className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl shadow-primary-900/15 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end lg:p-5 dark:border-white/10 dark:bg-[#1b2433]"
        >
          <div>
            <label htmlFor="search-kind" className={labelClass}>
              Type de bien
            </label>
            <select id="search-kind" value={kind} onChange={(e) => setKind(e.target.value)} className={fieldClass}>
              <option value="">Tous les types</option>
              {PROPERTY_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="search-commune" className={labelClass}>
              Commune
            </label>
            <select
              id="search-commune"
              value={commune}
              onChange={(e) => {
                setCommune(e.target.value)
                setQuartier("")
              }}
              className={fieldClass}
            >
              <option value="">Tout Bukavu</option>
              {(Object.keys(BUKAVU_LOCATIONS) as CommuneCode[]).map((code) => (
                <option key={code} value={code}>
                  {COMMUNE_LABELS[code] ?? code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="search-quartier" className={labelClass}>
              Quartier
            </label>
            <select
              id="search-quartier"
              value={quartier}
              onChange={(e) => setQuartier(e.target.value)}
              disabled={!commune}
              className={`${fieldClass} disabled:opacity-60`}
            >
              <option value="">{commune ? "Tous les quartiers" : "Choisissez la commune"}</option>
              {quartiersOf(commune).map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="search-budget" className={labelClass}>
              Budget maximum
            </label>
            <select id="search-budget" value={budget} onChange={(e) => setBudget(e.target.value)} className={fieldClass}>
              {BUDGETS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-900 sm:col-span-2 lg:col-span-1 dark:bg-accent-600 dark:hover:bg-[#a83608]"
          >
            <Search className="h-4 w-4" aria-hidden />
            Rechercher
          </button>
        </form>
      </div>

      {/* Bandeau de repères */}
      <section aria-label="Nyumbani Express en bref" className="mx-auto mt-8 max-w-6xl px-3 md:px-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 lg:grid-cols-4">
          {[
            { icon: Home, value: "6 types", label: "De la chambrette au terrain" },
            { icon: MapPin, value: "3 communes", label: "14 quartiers couverts" },
            { icon: ShieldCheck, value: "Vérifiés", label: "Chaque bien visité avant d'être proposé" },
            { icon: Users, value: "1 conseiller", label: "Du premier contact aux clés" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 bg-primary-900 p-4 text-white sm:p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <item.icon className="h-5 w-5 text-accent-500" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-[family-name:var(--font-display)] text-lg font-bold leading-tight sm:text-xl">
                  {item.value}
                </span>
                <span className="block text-xs text-white/70 sm:text-sm">{item.label}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Des biens vérifiés : section marketing, chaque action ouvre la demande */}
      <section id="biens" className="scroll-mt-24 py-16 md:py-24" aria-labelledby="biens-title">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent-500/30 bg-accent-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-600 dark:text-accent-500">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-500" aria-hidden />
                Nos biens
              </span>
              <h2
                id="biens-title"
                className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white"
              >
                Des biens vérifiés à Bukavu
              </h2>
              <p className="text-base leading-relaxed text-neutral-600 dark:text-white/70">
                Dites-nous ce que vous cherchez : un conseiller sélectionne pour vous les biens qui correspondent à
                votre budget et à votre quartier, puis organise les visites.
              </p>
            </div>
            <Link
              href="/demande-location"
              className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-primary-900 px-4 text-sm font-semibold text-primary-900 transition-colors hover:bg-primary-900 hover:text-white md:self-auto dark:border-white/30 dark:text-white dark:hover:bg-white/10"
            >
              Décrire ma recherche
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <ul className="grid auto-rows-[minmax(13rem,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SHOWCASE.map((item) => (
              <li key={item.kind} className={item.span ?? ""}>
                <Link
                  href={requestHrefFor({ type: item.kind })}
                  className={`group relative isolate flex h-full min-h-52 flex-col justify-end overflow-hidden rounded-2xl p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 ${
                    item.image ? "text-white" : item.tone
                  }`}
                >
                  {item.image ? (
                    <>
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 50vw, (min-width: 640px) 50vw, 100vw"
                        className="-z-10 object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span
                        className="absolute inset-0 -z-10 bg-gradient-to-t from-primary-900/90 via-primary-900/40 to-transparent"
                        aria-hidden
                      />
                    </>
                  ) : (
                    item.icon && (
                      <span className="mb-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                        <item.icon className="h-6 w-6" aria-hidden />
                      </span>
                    )
                  )}
                  <span className="relative">
                    <span className="block font-[family-name:var(--font-display)] text-xl font-bold">{item.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-white/85">{item.pitch}</span>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">
                      Demander ce type de bien
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            <li className="lg:col-span-2">
              <Link
                href="/demande-location"
                className="group flex h-full min-h-52 flex-col justify-end rounded-2xl border-2 border-dashed border-primary-900/25 p-5 text-primary-900 transition-colors hover:border-accent-600 hover:bg-accent-500/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:border-white/20 dark:text-white"
              >
                <span className="mb-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-900/10 dark:bg-white/10">
                  <ClipboardList className="h-6 w-6" aria-hidden />
                </span>
                <span className="block font-[family-name:var(--font-display)] text-xl font-bold">Un autre besoin ?</span>
                <span className="mt-1 block text-sm leading-relaxed text-neutral-600 dark:text-white/70">
                  Achat, location meublée, installation à Bukavu : décrivez votre projet, nous trouvons pour vous.
                </span>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-600 dark:text-accent-500">
                  Décrire ma recherche
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            </li>
          </ul>

          <div className="mt-10 grid gap-6 rounded-2xl border border-neutral-200 bg-neutral-100 p-6 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center dark:border-white/10 dark:bg-white/[0.03]">
            {PROMISES.map((promise) => (
              <div key={promise.title} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-accent-600 shadow-sm dark:bg-white/10 dark:text-accent-500">
                  <promise.icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-neutral-900 dark:text-white">{promise.title}</span>
                  <span className="block text-sm text-neutral-600 dark:text-white/70">{promise.text}</span>
                </span>
              </div>
            ))}
            <Link
              href="/demande-location"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-[#a83608]"
            >
              <ClipboardList className="h-4 w-4" aria-hidden />
              Faire ma demande
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
