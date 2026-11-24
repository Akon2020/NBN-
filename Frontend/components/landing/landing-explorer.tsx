"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BedDouble,
  Bath,
  Building,
  ClipboardList,
  Home,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Tag,
  Users,
} from "lucide-react"
import { PROPERTY_KINDS, propertyKindLabel, propertyKindOf, isLandKind } from "@/lib/propertyKinds"
import { BUKAVU_LOCATIONS, quartiersOf, type CommuneCode } from "@/lib/locations"
import { getImageUrl } from "@/lib/imageUrl"

type PublicProperty = {
  idProperty: number
  category: "RENT" | "SALE"
  propertyType: string
  commune?: string | null
  quartier?: string | null
  avenue?: string | null
  bedrooms?: number | null
  toilets?: number | null
  livingRooms?: number | null
  price?: number | string | null
  rentalDetails?: { unit?: string | null } | null
  images?: { image: string }[]
}

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

const UNIT_LABEL: Record<string, string> = { DAY: "/ jour", MONTH: "/ mois", YEAR: "/ an" }

const formatPrice = (property: PublicProperty) => {
  const value = Number(property.price)
  if (!Number.isFinite(value) || value <= 0) return "Prix sur demande"
  const amount = `${value.toLocaleString("fr-FR")} $`
  const unit = property.category === "RENT" ? UNIT_LABEL[property.rentalDetails?.unit ?? "MONTH"] ?? "" : ""
  return `${amount} ${unit}`.trim()
}

const placeOf = (property: PublicProperty) =>
  [property.quartier, property.commune ? COMMUNE_LABELS[property.commune as CommuneCode] ?? property.commune : null]
    .filter(Boolean)
    .join(", ") || "Bukavu"

type Props = { whatsapp: string }

export function LandingExplorer({ whatsapp }: Props) {
  const [properties, setProperties] = useState<PublicProperty[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [kind, setKind] = useState("")
  const [commune, setCommune] = useState("")
  const [quartier, setQuartier] = useState("")
  const [budget, setBudget] = useState("")
  const [applied, setApplied] = useState({ kind: "", commune: "", quartier: "", budget: "" })

  useEffect(() => {
    const controller = new AbortController()
    const base = process.env.NEXT_PUBLIC_API_URL || ""
    fetch(`${base}/api/properties/public?limit=24`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data) => setProperties(Array.isArray(data?.propertiesInfo) ? data.propertiesInfo : []))
      .catch((error) => {
        if (error?.name !== "AbortError") setFailed(true)
      })
    return () => controller.abort()
  }, [])

  const filtered = useMemo(() => {
    if (!properties) return []
    return properties.filter((property) => {
      if (applied.kind && propertyKindOf(property.propertyType) !== applied.kind) return false
      if (applied.commune && property.commune !== applied.commune) return false
      if (applied.quartier && property.quartier !== applied.quartier) return false
      if (applied.budget && Number(property.price) > Number(applied.budget)) return false
      return true
    })
  }, [properties, applied])

  const requestHref = useMemo(() => {
    const params = new URLSearchParams()
    if (applied.kind) params.set("type", applied.kind)
    if (applied.commune) params.set("commune", applied.commune)
    if (applied.quartier) params.set("quartier", applied.quartier)
    if (applied.budget) params.set("budgetMax", applied.budget)
    const query = params.toString()
    return `/demande-location${query ? `?${query}` : ""}`
  }, [applied])

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault()
    setApplied({ kind, commune, quartier, budget })
    document.getElementById("biens")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const fieldClass =
    "h-12 w-full appearance-none rounded-xl border border-neutral-200 bg-neutral-100 px-3 pr-8 text-sm font-medium text-neutral-900 focus:border-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-900/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
  const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-600 dark:text-white/60"

  const showcase = filtered.slice(0, 6)

  return (
    <>
      {/* Barre de recherche posée à cheval sur le bas du hero */}
      <div className="relative z-10 mx-auto -mt-20 max-w-6xl px-3 sm:-mt-16 md:px-6">
        <form
          onSubmit={onSearch}
          role="search"
          aria-label="Rechercher un bien"
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
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-900 sm:col-span-2 lg:col-span-1"
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
            {
              icon: Home,
              value: properties ? `${properties.length}${properties.length >= 24 ? "+" : ""}` : "...",
              label: "Biens disponibles",
            },
            { icon: MapPin, value: "3 communes", label: "14 quartiers couverts" },
            { icon: ShieldCheck, value: "Vérifiés", label: "Chaque bien visité avant publication" },
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

      {/* Biens disponibles */}
      <section id="biens" className="scroll-mt-6 py-16 md:py-24" aria-labelledby="biens-title">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent-500/30 bg-accent-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-600 dark:text-accent-500">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-500" aria-hidden />
                Disponibles maintenant
              </span>
              <h2
                id="biens-title"
                className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white"
              >
                Des biens vérifiés à Bukavu
              </h2>
              <p className="text-base leading-relaxed text-neutral-600 dark:text-white/70">
                Chaque bien est visité par notre équipe avant d&apos;être proposé. Un conseiller vous envoie photos,
                vidéos et conditions sur WhatsApp.
              </p>
            </div>
            <Link
              href={requestHref}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-primary-900 px-4 py-2.5 text-sm font-semibold text-primary-900 transition-colors hover:bg-primary-900 hover:text-white md:self-auto dark:border-white/30 dark:text-white"
            >
              Décrire ma recherche
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {properties === null && !failed && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Chargement des biens">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10">
                  <div className="aspect-[4/3] animate-pulse bg-neutral-100 dark:bg-white/5" />
                  <div className="space-y-3 p-5">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-100 dark:bg-white/5" />
                    <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-100 dark:bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {(failed || (properties !== null && showcase.length === 0)) && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-neutral-300 px-6 py-12 text-center dark:border-white/15">
              <Building className="h-10 w-10 text-neutral-600 dark:text-white/50" aria-hidden />
              <div className="max-w-md space-y-2">
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {failed
                    ? "Les biens ne peuvent pas être affichés pour le moment."
                    : "Aucun bien affiché ne correspond à cette recherche."}
                </p>
                <p className="text-sm text-neutral-600 dark:text-white/70">
                  Notre réseau compte aussi des biens non publiés. Décrivez votre recherche, un conseiller vous
                  recontacte avec des propositions adaptées.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={requestHref}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 text-sm font-semibold text-white hover:bg-[#a83608]"
                >
                  <ClipboardList className="h-4 w-4" aria-hidden />
                  Faire une demande
                </Link>
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                    "Bonjour, je recherche un bien avec Nyumbani Express.",
                  )}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-300 px-5 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Écrire sur WhatsApp
                </a>
              </div>
            </div>
          )}

          {showcase.length > 0 && (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {showcase.map((property) => {
                const image = property.images?.[0]?.image
                const reference = `NBN-${property.idProperty}`
                const message = `Bonjour, je suis intéressé(e) par le bien ${reference} (${propertyKindLabel(
                  property.propertyType,
                )} à ${placeOf(property)}). Pouvez-vous m'envoyer plus d'informations ?`
                return (
                  <li
                    key={property.idProperty}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-xl dark:border-white/10 dark:bg-[#1b2433]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-white/5">
                      {image ? (
                        <Image
                          src={getImageUrl(image)}
                          alt={`${propertyKindLabel(property.propertyType)} à ${placeOf(property)}`}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Home className="h-10 w-10 text-neutral-600/50" aria-hidden />
                        </div>
                      )}
                      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-primary-900 shadow">
                        {property.category === "RENT" ? "À louer" : "À vendre"}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-neutral-900 dark:text-white">
                            {propertyKindLabel(property.propertyType)}
                          </h3>
                          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-neutral-600 dark:text-white/70">
                            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {placeOf(property)}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-neutral-600 dark:text-white/60">
                          {reference}
                        </span>
                      </div>
                      {!isLandKind(property.propertyType) && (
                        <div className="flex flex-wrap gap-3 text-sm text-neutral-600 dark:text-white/70">
                          {property.bedrooms != null && (
                            <span className="inline-flex items-center gap-1.5">
                              <BedDouble className="h-4 w-4" aria-hidden />
                              {property.bedrooms} ch.
                            </span>
                          )}
                          {property.toilets != null && (
                            <span className="inline-flex items-center gap-1.5">
                              <Bath className="h-4 w-4" aria-hidden />
                              {property.toilets} s. de bain
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-white/10">
                        <span className="inline-flex items-center gap-1.5 font-[family-name:var(--font-display)] text-lg font-bold text-primary-900 dark:text-white">
                          <Tag className="h-4 w-4 text-accent-500" aria-hidden />
                          {formatPrice(property)}
                        </span>
                        <a
                          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary-900 px-3 text-sm font-semibold text-white hover:bg-primary-700"
                          aria-label={`Demander des informations sur le bien ${reference}`}
                        >
                          <MessageCircle className="h-4 w-4" aria-hidden />
                          Intéressé
                        </a>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
