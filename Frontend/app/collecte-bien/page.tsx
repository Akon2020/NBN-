"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Manrope, Inter } from "next/font/google"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, EyeOff, Lock } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { FormWizard, useFormDraft, type WizardStep } from "@/components/forms/form-wizard"
import {
  ChoiceChips,
  Field,
  MultiChoiceChips,
  TextField,
} from "@/components/forms/form-fields"
import {
  LocationFields,
  resolveAvenues,
  validateLocation,
  type LocationValue,
} from "@/components/forms/location-fields"
import { getMyCommissionnaireCode, submitPropertyCollection } from "@/actions/propertyCollections"
import { getAuthUser } from "@/lib/auth"
import {
  isEmailFormatValid,
  normalizeCommissionnaireCode,
  normalizePhone,
} from "@/lib/contactValidation"
import {
  ACCEPTE_COMMISSION_CHOICES,
  ACCESSIBILITE_CHOICES,
  COLLECTE_TYPE_BIEN_CHOICES,
  countChoices,
  DISPONIBILITE_CHOICES,
  DISPONIBILITE_VISITE_CHOICES,
  ETAT_BIEN_CHOICES,
  MODALITE_PAIEMENT_CHOICES,
  OBSERVATION_CHOICES,
  OUI_NON_CHOICES,
  REMPLISSEUR_CHOICES,
  RESPONSABLE_STATUT_CHOICES,
  TYPE_MISSION_CHOICES,
  TYPE_OPERATION_CHOICES,
  type PropertyCollectionPayload,
} from "@/lib/types"
import { toast } from "sonner"

const manrope = Manrope({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" })
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" })

const EMPTY_LOCATION: LocationValue = { commune: "", quartier: "", avenues: [], avenueAutre: "" }

const EMPTY_FORM = {
  // "RESPONSABLE" | "COLLECTEUR"
  remplisseur: "",
  // Tri-état ("" = pas encore répondu), comme toutes les questions oui/non.
  parCommissionnaire: "",
  typeMission: "COLLECTE_BIEN",
  typeOperation: "",
  propertyType: "",
  location: EMPTY_LOCATION,
  prix: "",
  prixMinimum: "",
  modalitePaiement: "",
  modalitePaiementAutre: "",
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
  responsableStatut: "",
  responsableNom: "",
  responsablePhone: "",
  responsableEmail: "",
  responsableIdNumber: "",
  responsableDisponibiliteVisite: "",
  responsableAccepteCommission: "",
  collecteurNom: "",
  collecteurPhone: "",
  codeCommissionnaire: "",
}

// v2 : « propriétaire » devenu « responsable », localisation structurée.
const DRAFT_KEY = "nbn-collecte-bien-v2"

type CountKey = "bedrooms" | "livingRooms" | "toilets" | "kitchens" | "depots"

const COUNTS: { key: CountKey; label: string; max: number }[] = [
  { key: "bedrooms", label: "Nombre de chambres", max: 10 },
  { key: "toilets", label: "Nombre de salles de bain", max: 10 },
  { key: "livingRooms", label: "Nombre de salons", max: 5 },
  { key: "kitchens", label: "Nombre de cuisines", max: 5 },
  { key: "depots", label: "Nombre de dépôts", max: 5 },
]

// Un compteur vaut soit une pastille ("3"), soit la saisie libre associée.
const resolveCount = (value: string, autre: string) => (value === "AUTRE" ? autre.trim() : value)
const isCount = (value: string) => /^\d+$/.test(value)

export default function CollecteBienPage() {
  const { value: form, setValue: setForm, clear, restored } = useFormDraft(DRAFT_KEY, EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [prefilled, setPrefilled] = useState(false)

  const set = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const parResponsable = form.remplisseur === "RESPONSABLE"
  const parCommissionnaire = form.remplisseur === "COLLECTEUR" && form.parCommissionnaire === "OUI"
  const isRent = form.typeOperation === "RENT"
  const countOf = (key: CountKey) => resolveCount(form[key], form[`${key}Autre`])

  // Préremplissage du commissionnaire quand la personne est connectée — la
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
        remplisseur: form.remplisseur as PropertyCollectionPayload["remplisseur"],
        parCommissionnaire: parResponsable ? undefined : parCommissionnaire,
        typeMission: form.typeMission,
        typeOperation: form.typeOperation,
        propertyType: form.propertyType,
        commune: form.location.commune,
        quartier: form.location.quartier,
        avenue: resolveAvenues(form.location)[0] ?? "",
        prix: form.prix.trim(),
        prixMinimum: form.prixMinimum.trim() || undefined,
        modalitePaiement: isRent ? form.modalitePaiement : undefined,
        modalitePaiementAutre: isRent ? form.modalitePaiementAutre.trim() || undefined : undefined,
        bedrooms: countOf("bedrooms"),
        livingRooms: countOf("livingRooms"),
        toilets: countOf("toilets"),
        kitchens: countOf("kitchens"),
        depots: countOf("depots"),
        hasElectricity: form.hasElectricity ? form.hasElectricity === "OUI" : undefined,
        hasWater: form.hasWater ? form.hasWater === "OUI" : undefined,
        accessibilite: form.accessibilite || undefined,
        disponibilite: form.disponibilite || undefined,
        etatBien: form.etatBien || undefined,
        observations: observations || undefined,
        responsableStatut: form.responsableStatut,
        responsableNom: form.responsableNom.trim(),
        responsablePhone: normalizePhone(form.responsablePhone) ?? form.responsablePhone.trim(),
        responsableEmail: form.responsableEmail.trim().toLowerCase() || undefined,
        responsableIdNumber: form.responsableIdNumber.trim() || undefined,
        responsableDisponibiliteVisite: form.responsableDisponibiliteVisite,
        responsableAccepteCommission: form.responsableAccepteCommission,
        ...(parCommissionnaire
          ? {
              collecteurNom: form.collecteurNom.trim(),
              collecteurPhone: normalizePhone(form.collecteurPhone) ?? form.collecteurPhone.trim(),
              codeCommissionnaire:
                normalizeCommissionnaireCode(form.codeCommissionnaire) ?? form.codeCommissionnaire.trim(),
            }
          : {}),
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

  const mediaNote = (
    <p className="rounded-md bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
      Les photos et vidéos du bien s&apos;ajoutent depuis la fiche du bien une fois cette collecte
      enregistrée — pas besoin de les avoir sous la main maintenant.
    </p>
  )

  const steps: WizardStep[] = [
    {
      id: "remplisseur",
      title: "Qui remplit ce formulaire ?",
      subtitle: "La suite du formulaire s'adapte à votre réponse.",
      validate: () => {
        if (!form.remplisseur) return "Indiquez qui remplit ce formulaire."
        if (form.remplisseur === "COLLECTEUR" && !form.parCommissionnaire) {
          return "Indiquez si le bien est collecté par un commissionnaire."
        }
        return null
      },
      content: (
        <div className="space-y-5">
          <Field label="Vous êtes" required>
            <ChoiceChips
              choices={REMPLISSEUR_CHOICES}
              value={form.remplisseur}
              onChange={(v) => set("remplisseur", v)}
            />
          </Field>
          {form.remplisseur === "COLLECTEUR" && (
            <Field
              label="Le bien est-il collecté par un commissionnaire ?"
              required
              hint="Si oui, son identité et son code CCM seront demandés à la dernière étape."
            >
              <ChoiceChips
                choices={OUI_NON_CHOICES}
                value={form.parCommissionnaire}
                onChange={(v) => set("parCommissionnaire", v)}
              />
            </Field>
          )}
        </div>
      ),
    },
    {
      id: "mission",
      title: "Nature de la collecte",
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
      validate: () => validateLocation(form.location),
      content: (
        <LocationFields
          value={form.location}
          onChange={(v) => set("location", v)}
          required
          avenueLabel="Avenue"
        />
      ),
    },
    {
      id: "prix",
      title: "Prix et paiement",
      subtitle: "Le montant demandé par le responsable. Précisez la devise si ce n'est pas des dollars.",
      validate: () => {
        if (!form.prix.trim()) return "Le prix fixé est requis."
        if (isRent && !form.modalitePaiement) return "Choisissez la modalité de paiement."
        if (isRent && form.modalitePaiement === "AUTRE" && !form.modalitePaiementAutre.trim()) {
          return "Précisez la modalité de paiement."
        }
        return null
      },
      content: (
        <div className="space-y-5">
          <Field label="Prix fixé" required>
            <TextField value={form.prix} onChange={(v) => set("prix", v)} placeholder="Ex. 250$ ou 500000 FC" />
          </Field>
          <Field
            label="Avez-vous un autre minimum acceptable ?"
            hint="Le prix le plus bas accepté si un client intéressé négocie."
          >
            <div className="space-y-2">
              <TextField
                value={form.prixMinimum}
                onChange={(v) => set("prixMinimum", v)}
                placeholder="Ex. 220$"
              />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <EyeOff className="h-3.5 w-3.5 shrink-0" />
                Visible uniquement par l&apos;administration de l&apos;agence.
              </p>
            </div>
          </Field>
          {isRent && (
            <Field label="Modalité de paiement" required>
              <ChoiceChips
                choices={MODALITE_PAIEMENT_CHOICES}
                value={form.modalitePaiement}
                onChange={(v) => set("modalitePaiement", v)}
                otherValue="AUTRE"
                otherText={form.modalitePaiementAutre}
                onOtherTextChange={(v) => set("modalitePaiementAutre", v)}
              />
            </Field>
          )}
        </div>
      ),
    },
    {
      id: "composition",
      title: "Composition du bien",
      subtitle: "Choisissez « Aucun » quand la pièce n'existe pas.",
      validate: () => {
        const missing = COUNTS.find(({ key }) => !isCount(countOf(key)))
        return missing ? `${missing.label} : choisissez une valeur (« Aucun » s'il n'y en a pas).` : null
      },
      content: (
        <div className="space-y-5">
          {COUNTS.map(({ key, label, max }) => (
            <Field key={key} label={label} required>
              <ChoiceChips
                choices={countChoices(max, true)}
                value={form[key]}
                onChange={(v) => set(key, v)}
                otherValue="AUTRE"
                otherText={form[`${key}Autre`]}
                onOtherTextChange={(v) => set(`${key}Autre`, v)}
                otherPlaceholder="Combien ?"
              />
            </Field>
          ))}
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
      id: "responsable",
      title: parResponsable ? "Vous, responsable du bien" : "Le responsable du bien",
      subtitle: parResponsable
        ? "Vos coordonnées, pour que l'agence puisse vous recontacter."
        : "Le propriétaire, mandataire, gérant ou la société qui gère ce bien.",
      validate: () => {
        if (!form.responsableStatut) return "Indiquez le statut du responsable."
        if (!form.responsableNom.trim()) return "Le nom du responsable est requis."
        if (!normalizePhone(form.responsablePhone)) return "Le téléphone du responsable n'est pas valide."
        if (parResponsable && !form.responsableEmail.trim()) return "Votre adresse e-mail est requise."
        if (form.responsableEmail.trim() && !isEmailFormatValid(form.responsableEmail)) {
          return "L'adresse e-mail n'est pas valide."
        }
        if (!form.responsableDisponibiliteVisite) return "Indiquez la disponibilité pour les visites."
        if (!form.responsableAccepteCommission) return "Indiquez la position sur la commission de l'agence."
        return null
      },
      content: (
        <div className="space-y-5">
          <Field label="Statut" required>
            <ChoiceChips
              choices={RESPONSABLE_STATUT_CHOICES}
              value={form.responsableStatut}
              onChange={(v) => set("responsableStatut", v)}
            />
          </Field>
          <Field
            label={form.responsableStatut === "SOCIETE" ? "Nom de la société / de l'établissement" : "Nom complet"}
            required
          >
            <TextField value={form.responsableNom} onChange={(v) => set("responsableNom", v)} />
          </Field>
          <Field label="Téléphone" required>
            <TextField
              value={form.responsablePhone}
              onChange={(v) => set("responsablePhone", v)}
              type="tel"
              inputMode="tel"
              placeholder="+243 ..."
            />
          </Field>
          <Field label="Adresse e-mail" required={parResponsable}>
            <TextField
              value={form.responsableEmail}
              onChange={(v) => set("responsableEmail", v)}
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="exemple@gmail.com"
            />
          </Field>
          <Field label="Numéro de la pièce d'identité">
            <TextField
              value={form.responsableIdNumber}
              onChange={(v) => set("responsableIdNumber", v)}
              autoCapitalize="characters"
            />
          </Field>
          <Field label="Disponible pour les visites ?" required>
            <ChoiceChips
              choices={DISPONIBILITE_VISITE_CHOICES}
              value={form.responsableDisponibiliteVisite}
              onChange={(v) => set("responsableDisponibiliteVisite", v)}
            />
          </Field>
          <Field label="Accepte la commission de l'agence ?" required>
            <ChoiceChips
              choices={ACCEPTE_COMMISSION_CHOICES}
              value={form.responsableAccepteCommission}
              onChange={(v) => set("responsableAccepteCommission", v)}
            />
          </Field>
          {!parCommissionnaire && mediaNote}
        </div>
      ),
    },
    ...(parCommissionnaire
      ? [
          {
            id: "commissionnaire",
            title: "Le commissionnaire",
            subtitle: "Pour que la collecte lui soit correctement attribuée.",
            validate: () => {
              if (!form.collecteurNom.trim()) return "Le nom du commissionnaire est requis."
              if (!normalizePhone(form.collecteurPhone)) return "Le téléphone du commissionnaire n'est pas valide."
              if (!normalizeCommissionnaireCode(form.codeCommissionnaire)) {
                return "Le code commissionnaire est requis, au format CCM-042."
              }
              return null
            },
            content: (
              <div className="space-y-5">
                <Field label="Nom complet" required>
                  <TextField value={form.collecteurNom} onChange={(v) => set("collecteurNom", v)} />
                </Field>
                <Field label="Numéro (WhatsApp actif)" required>
                  <TextField
                    value={form.collecteurPhone}
                    onChange={(v) => set("collecteurPhone", v)}
                    type="tel"
                    inputMode="tel"
                    placeholder="+243 ..."
                  />
                </Field>
                <Field label="Code CCM" required hint="Code CoMmissionnaire attribué par l'agence.">
                  <TextField
                    value={form.codeCommissionnaire}
                    onChange={(v) => set("codeCommissionnaire", v)}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Ex. CCM-042"
                  />
                </Field>
                {mediaNote}
              </div>
            ),
          } satisfies WizardStep,
        ]
      : []),
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
                Usage interne — équipe, commissionnaires et responsables de biens
              </div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Collecte de bien
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Enregistrez un bien. Vos réponses sont sauvegardées au fur et à mesure — vous pouvez
                interrompre et reprendre plus tard.
              </p>
            </div>

            {restored && (
              <FormWizard
                steps={steps}
                onSubmit={handleSubmit}
                submitLabel="Enregistrer le bien"
                isSubmitting={isSubmitting}
                draftKey={DRAFT_KEY}
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
