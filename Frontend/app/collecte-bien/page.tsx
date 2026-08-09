"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Manrope, Inter } from "next/font/google"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Lock } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { FormWizard, useFormDraft, type WizardStep } from "@/components/forms/form-wizard"
import {
  ChoiceChips,
  Field,
  MultiChoiceChips,
  TextAreaField,
  TextField,
} from "@/components/forms/form-fields"
import { getMyCommissionnaireCode, submitPropertyCollection } from "@/actions/propertyCollections"
import { getAuthUser } from "@/lib/auth"
import {
  ACCEPTE_COMMISSION_CHOICES,
  ACCESSIBILITE_CHOICES,
  COLLECTE_TYPE_BIEN_CHOICES,
  COMMUNE_CHOICES,
  countChoices,
  DISPONIBILITE_CHOICES,
  DISPONIBILITE_VISITE_CHOICES,
  ETAT_BIEN_CHOICES,
  OBSERVATION_CHOICES,
  OUI_NON_CHOICES,
  QUARTIER_SUGGESTIONS,
  TYPE_MISSION_CHOICES,
  TYPE_OPERATION_CHOICES,
  type PropertyCollectionPayload,
} from "@/lib/types"
import { toast } from "sonner"

const manrope = Manrope({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" })
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" })

const EMPTY_FORM = {
  typeMission: "COLLECTE_BIEN",
  typeOperation: "",
  propertyType: "",
  commune: "",
  quartier: "",
  avenue: "",
  prix: "",
  bedrooms: "",
  bedroomsAutre: "",
  livingRooms: "",
  livingRoomsAutre: "",
  toilets: "",
  toiletsAutre: "",
  kitchens: "",
  kitchensAutre: "",
  depots: "",
  depotsAutre: "",
  hasElectricity: "",
  hasWater: "",
  accessibilite: "",
  disponibilite: "",
  etatBien: "",
  observations: [] as string[],
  observationAutre: "",
  proprietaireNom: "",
  proprietairePhone: "",
  proprietaireDisponibiliteVisite: "",
  proprietaireAccepteCommission: "",
  collecteurNom: "",
  collecteurPhone: "",
  codeCommissionnaire: "",
}

// Un compteur vaut soit une pastille ("3"), soit la saisie libre associée.
const resolveCount = (value: string, autre: string) => (value === "AUTRE" ? autre.trim() : value)

export default function CollecteBienPage() {
  const { value: form, setValue: setForm, clear, restored } = useFormDraft("nbn-collecte-bien", EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [prefilled, setPrefilled] = useState(false)

  const set = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // Préremplissage du collecteur quand la personne est connectée — la
  // saisie manuelle reste possible et prioritaire (un champ déjà rempli
  // par le brouillon n'est jamais écrasé).
  useEffect(() => {
    if (!restored || prefilled) return
    setPrefilled(true)

    const user = getAuthUser()
    if (user?.fullName) {
      setForm((prev) => (prev.collecteurNom ? prev : { ...prev, collecteurNom: user.fullName }))
    }
    getMyCommissionnaireCode().then((code) => {
      if (code) {
        setForm((prev) => (prev.codeCommissionnaire ? prev : { ...prev, codeCommissionnaire: code }))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, prefilled])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const observations = [
        ...form.observations.filter((o) => o !== "AUTRE").map(
          (o) => OBSERVATION_CHOICES.find((c) => c.value === o)?.label || o
        ),
        ...(form.observations.includes("AUTRE") && form.observationAutre.trim()
          ? [form.observationAutre.trim()]
          : []),
      ].join(" · ")

      const payload: PropertyCollectionPayload = {
        typeMission: form.typeMission,
        typeOperation: form.typeOperation,
        propertyType: form.propertyType,
        commune: form.commune,
        prix: form.prix.trim(),
        proprietaireNom: form.proprietaireNom.trim(),
        proprietairePhone: form.proprietairePhone.trim(),
        collecteurNom: form.collecteurNom.trim(),
        quartier: form.quartier.trim() || undefined,
        avenue: form.avenue.trim() || undefined,
        bedrooms: resolveCount(form.bedrooms, form.bedroomsAutre) || undefined,
        livingRooms: resolveCount(form.livingRooms, form.livingRoomsAutre) || undefined,
        toilets: resolveCount(form.toilets, form.toiletsAutre) || undefined,
        kitchens: resolveCount(form.kitchens, form.kitchensAutre) || undefined,
        depots: resolveCount(form.depots, form.depotsAutre) || undefined,
        hasElectricity: form.hasElectricity ? form.hasElectricity === "OUI" : undefined,
        hasWater: form.hasWater ? form.hasWater === "OUI" : undefined,
        accessibilite: form.accessibilite || undefined,
        disponibilite: form.disponibilite || undefined,
        etatBien: form.etatBien || undefined,
        observations: observations || undefined,
        proprietaireDisponibiliteVisite: form.proprietaireDisponibiliteVisite || undefined,
        proprietaireAccepteCommission: form.proprietaireAccepteCommission || undefined,
        collecteurPhone: form.collecteurPhone.trim() || undefined,
        codeCommissionnaire: form.codeCommissionnaire.trim() || undefined,
      }

      await submitPropertyCollection(payload)
      clear()
      setSubmitted(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const quartierSuggestions = QUARTIER_SUGGESTIONS[form.commune] || []

  const countField = (
    label: string,
    key: "bedrooms" | "livingRooms" | "toilets" | "kitchens" | "depots",
    autreKey: "bedroomsAutre" | "livingRoomsAutre" | "toiletsAutre" | "kitchensAutre" | "depotsAutre",
    max: number
  ) => (
    <Field label={label}>
      <ChoiceChips
        choices={countChoices(max)}
        value={form[key]}
        onChange={(v) => set(key, v)}
        otherValue="AUTRE"
        otherText={form[autreKey]}
        onOtherTextChange={(v) => set(autreKey, v)}
        otherPlaceholder="Combien ?"
      />
    </Field>
  )

  const steps: WizardStep[] = [
    {
      id: "mission",
      title: "Nature de la collecte",
      subtitle: "Commençons par situer ce que vous rapportez du terrain.",
      validate: () => {
        if (!form.typeMission) return "Indiquez le type de mission."
        if (!form.typeOperation) return "Indiquez s'il s'agit d'une location ou d'une vente."
        if (!form.propertyType) return "Indiquez le type de bien."
        return null
      },
      content: (
        <div className="space-y-5">
          <Field label="Type de mission" required>
            <ChoiceChips
              choices={TYPE_MISSION_CHOICES}
              value={form.typeMission}
              onChange={(v) => set("typeMission", v)}
            />
          </Field>
          <Field label="Type d'opération" required>
            <ChoiceChips
              choices={TYPE_OPERATION_CHOICES}
              value={form.typeOperation}
              onChange={(v) => set("typeOperation", v)}
            />
          </Field>
          <Field label="Type de bien" required>
            <ChoiceChips
              choices={COLLECTE_TYPE_BIEN_CHOICES}
              value={form.propertyType}
              onChange={(v) => set("propertyType", v)}
            />
          </Field>
        </div>
      ),
    },
    {
      id: "localisation",
      title: "Où se trouve le bien ?",
      validate: () => (form.commune ? null : "La commune est requise."),
      content: (
        <div className="space-y-5">
          <Field label="Commune" required>
            <ChoiceChips choices={COMMUNE_CHOICES} value={form.commune} onChange={(v) => set("commune", v)} />
          </Field>
          <Field label="Quartier">
            <div className="space-y-2">
              <TextField value={form.quartier} onChange={(v) => set("quartier", v)} placeholder="Nom du quartier" />
              {quartierSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {quartierSuggestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => set("quartier", q)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary-900/40 hover:text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <Field label="Avenue / repère connu">
            <TextField
              value={form.avenue}
              onChange={(v) => set("avenue", v)}
              placeholder="Ex. Av. Lumumba, près de l'école..."
            />
          </Field>
        </div>
      ),
    },
    {
      id: "prix",
      title: "Prix fixé",
      subtitle: "Le montant demandé par le propriétaire. Précisez la devise si ce n'est pas des dollars.",
      validate: () => (form.prix.trim() ? null : "Le prix fixé est requis."),
      content: (
        <Field label="Prix fixé" required>
          <TextField value={form.prix} onChange={(v) => set("prix", v)} placeholder="Ex. 250$ ou 500000 FC" />
        </Field>
      ),
    },
    {
      id: "composition",
      title: "Composition du bien",
      subtitle: "Laissez vide ce qui ne s'applique pas (une parcelle nue, par exemple).",
      content: (
        <div className="space-y-5">
          {countField("Nombre de chambres", "bedrooms", "bedroomsAutre", 10)}
          {countField("Nombre de salles de bain", "toilets", "toiletsAutre", 10)}
          {countField("Nombre de salons", "livingRooms", "livingRoomsAutre", 5)}
          {countField("Nombre de cuisines", "kitchens", "kitchensAutre", 5)}
          {countField("Nombre de dépôts", "depots", "depotsAutre", 5)}
        </div>
      ),
    },
    {
      id: "etat",
      title: "État et accès",
      content: (
        <div className="space-y-5">
          <Field label="Présence d'électricité">
            <ChoiceChips
              choices={OUI_NON_CHOICES}
              value={form.hasElectricity}
              onChange={(v) => set("hasElectricity", v)}
            />
          </Field>
          <Field label="Présence d'eau">
            <ChoiceChips choices={OUI_NON_CHOICES} value={form.hasWater} onChange={(v) => set("hasWater", v)} />
          </Field>
          <Field label="Accessibilité">
            <ChoiceChips
              choices={ACCESSIBILITE_CHOICES}
              value={form.accessibilite}
              onChange={(v) => set("accessibilite", v)}
            />
          </Field>
          <Field label="Disponibilité">
            <ChoiceChips
              choices={DISPONIBILITE_CHOICES}
              value={form.disponibilite}
              onChange={(v) => set("disponibilite", v)}
            />
          </Field>
          <Field label="État du bien">
            <ChoiceChips choices={ETAT_BIEN_CHOICES} value={form.etatBien} onChange={(v) => set("etatBien", v)} />
          </Field>
          <Field label="Observations du terrain" hint="Ce que vous avez remarqué sur place.">
            <MultiChoiceChips
              choices={OBSERVATION_CHOICES}
              values={form.observations}
              onChange={(v) => set("observations", v)}
              otherValue="AUTRE"
              otherText={form.observationAutre}
              onOtherTextChange={(v) => set("observationAutre", v)}
            />
          </Field>
        </div>
      ),
    },
    {
      id: "proprietaire",
      title: "Le propriétaire",
      subtitle: "Ses coordonnées et sa position sur les conditions de l'agence.",
      validate: () => {
        if (!form.proprietaireNom.trim()) return "Le nom du propriétaire est requis."
        if (!form.proprietairePhone.trim()) return "Le téléphone du propriétaire est requis."
        return null
      },
      content: (
        <div className="space-y-5">
          <Field label="Nom du propriétaire" required>
            <TextField value={form.proprietaireNom} onChange={(v) => set("proprietaireNom", v)} />
          </Field>
          <Field label="Téléphone du propriétaire" required>
            <TextField
              value={form.proprietairePhone}
              onChange={(v) => set("proprietairePhone", v)}
              type="tel"
              inputMode="tel"
              placeholder="+243 ..."
            />
          </Field>
          <Field label="Est-il disponible pour les visites ?" required>
            <ChoiceChips
              choices={DISPONIBILITE_VISITE_CHOICES}
              value={form.proprietaireDisponibiliteVisite}
              onChange={(v) => set("proprietaireDisponibiliteVisite", v)}
            />
          </Field>
          <Field label="Accepte-t-il la commission agence ?" required>
            <ChoiceChips
              choices={ACCEPTE_COMMISSION_CHOICES}
              value={form.proprietaireAccepteCommission}
              onChange={(v) => set("proprietaireAccepteCommission", v)}
            />
          </Field>
        </div>
      ),
    },
    {
      id: "collecteur",
      title: "Vous",
      subtitle: "Pour que la collecte vous soit correctement attribuée.",
      validate: () => (form.collecteurNom.trim() ? null : "Votre nom est requis."),
      content: (
        <div className="space-y-5">
          <Field label="Votre nom complet" required>
            <TextField value={form.collecteurNom} onChange={(v) => set("collecteurNom", v)} />
          </Field>
          <Field label="Votre numéro (WhatsApp actif)">
            <TextField
              value={form.collecteurPhone}
              onChange={(v) => set("collecteurPhone", v)}
              type="tel"
              inputMode="tel"
            />
          </Field>
          <Field label="Code CCL" hint="Le code qui vous a été attribué par l'agence, si vous en avez un.">
            <TextField
              value={form.codeCommissionnaire}
              onChange={(v) => set("codeCommissionnaire", v)}
              placeholder="Ex. CCL-042"
            />
          </Field>
          <p className="rounded-md bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
            Les photos et vidéos du bien s&apos;ajoutent depuis la fiche du bien une fois cette collecte
            enregistrée — vous n&apos;avez pas besoin de les avoir sous la main maintenant.
          </p>
        </div>
      ),
    },
  ]

  return (
    <div className={`${manrope.variable} ${inter.variable} min-h-screen bg-muted/30 font-[family-name:var(--font-body)]`}>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/nyumbani-logo.png" alt="Nyumbani Express" width={120} height={40} className="h-10 w-auto" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-10 md:px-6 md:py-14">
        {submitted ? (
          <Card className="border-border">
            <CardContent className="space-y-5 p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary-600/10">
                <CheckCircle2 className="h-8 w-8 text-secondary-600" />
              </div>
              <div className="space-y-2">
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Bien enregistré</h1>
                <p className="text-muted-foreground leading-relaxed">
                  Merci ! Le bien est désormais dans la base et visible par l&apos;équipe.
                </p>
              </div>
              <Button
                onClick={() => setSubmitted(false)}
                className="h-12 w-full bg-accent-600 text-white hover:bg-accent-600/90"
              >
                Collecter un autre bien
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-900/10 px-3 py-1.5 text-xs font-medium text-primary-900 dark:bg-white/10 dark:text-white">
                <Lock className="h-3.5 w-3.5" />
                Usage interne — équipe et commissionnaires
              </div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Collecte de bien
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Enregistrez un bien relevé sur le terrain. Vos réponses sont sauvegardées au fur et à mesure —
                vous pouvez interrompre et reprendre plus tard.
              </p>
            </div>

            {restored && (
              <FormWizard
                steps={steps}
                onSubmit={handleSubmit}
                submitLabel="Enregistrer le bien"
                isSubmitting={isSubmitting}
                draftKey="nbn-collecte-bien"
                onClearDraft={() => {
                  clear()
                  toast.success("Brouillon effacé")
                }}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
