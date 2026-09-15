"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Manrope, Inter } from "next/font/google"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { CheckCircle2, ShieldCheck } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { FormWizard, useFormDraft, type WizardStep } from "@/components/forms/form-wizard"
import {
  ChoiceChips,
  Field,
  MultiChoiceChips,
  TextAreaField,
  TextField,
} from "@/components/forms/form-fields"
import {
  LocationFields,
  resolveAvenues,
  validateLocation,
  type LocationValue,
} from "@/components/forms/location-fields"
import { submitRentalRequest } from "@/actions/rentalRequests"
import {
  isEmailFormatValid,
  normalizeCommissionnaireCode,
  normalizePhone,
} from "@/lib/contactValidation"
import {
  AVANTAGE_CHOICES,
  CANAL_CONTACT_CHOICES,
  CHARGES_INCLUSES_CHOICES,
  DEVISE_CHOICES,
  ELEMENT_PARTICULIER_CHOICES,
  EQUIPEMENT_CHOICES,
  MODALITE_PAIEMENT_CHOICES,
  NOMBRE_CHAMBRES_CHOICES,
  NOMBRE_SALONS_CHOICES,
  NOMBRE_TOILETTES_CHOICES,
  SEXE_CHOICES,
  TYPE_BIEN_SOUHAITE_CHOICES,
  TYPE_CLIENT_CHOICES,
  TYPE_OCCUPANTS_CHOICES,
  URGENCE_CHOICES,
  USAGE_BIEN_CHOICES,
  VILLE_CHOICES,
  type RentalRequestPayload,
} from "@/lib/types"
import { toast } from "sonner"

const manrope = Manrope({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" })
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" })

const CONDITIONS = [
  {
    title: "Informations fournies",
    body: "Je m'engage à fournir des informations exactes et sincères. Toute fausse déclaration peut entraîner le rejet de ma demande.",
  },
  {
    title: "Rôle de l'agence",
    body: "Je comprends que Nyumbani Express agit comme intermédiaire entre moi et les propriétaires, et que les biens proposés sont issus de son réseau.",
  },
  {
    title: "Mise en relation officielle",
    body: "Je reconnais que tout bien présenté par l'agence constitue une mise en relation officielle.",
  },
  {
    title: "Engagement de non-contournement",
    body: "Je m'engage à ne pas contacter directement le propriétaire d'un bien présenté par l'agence, à ne pas chercher à conclure une transaction sans passer par l'agence, et à ne pas utiliser les informations reçues pour la contourner. Cet engagement reste valable pendant toute la recherche et jusqu'à 12 mois après.",
  },
  {
    title: "Confidentialité",
    body: "Je m'engage à ne pas partager les contacts des propriétaires, les informations sur les biens, ni les détails reçus via l'agence.",
  },
  {
    title: "Frais de service",
    body: "Je comprends que certains services peuvent être payants (visites, mise en relation, accompagnement) et que les conditions me seront expliquées avant toute transaction.",
  },
  {
    title: "Respect de la collaboration",
    body: "Je m'engage à collaborer de manière sérieuse et respectueuse avec l'équipe.",
  },
  {
    title: "En cas de non-respect",
    body: "Je comprends que tout contournement ou comportement frauduleux peut entraîner l'annulation du service, des pénalités, ou des actions conformément aux règles en vigueur.",
  },
]

const EMPTY_LOCATION: LocationValue = { commune: "", quartier: "", avenues: [], avenueAutre: "" }

const EMPTY_FORM = {
  fullName: "",
  phone: "",
  email: "",
  lieuProvenance: "",
  residenceActuelle: "",
  sexe: "",
  typeClient: "",
  canalContact: "",
  canalContactAutre: "",
  typesBien: [] as string[],
  typeBienAutre: "",
  usageBien: "",
  ville: "",
  villeAutre: "",
  location: EMPTY_LOCATION,
  // Hors Bukavu, le référentiel ne s'applique pas : saisie libre.
  quartierLibre: "",
  avenuesLibres: "",
  budgetMin: "",
  budgetMax: "",
  devise: "USD",
  modalitePaiement: "",
  modalitePaiementAutre: "",
  chargesIncluses: "",
  nombreChambres: "",
  nombreChambresAutre: "",
  nombreSalons: "",
  nombreToilettes: "",
  equipements: [] as string[],
  avantages: [] as string[],
  avantageAutre: "",
  urgence: "",
  urgenceAutre: "",
  dateEntree: "",
  typeOccupants: "",
  nombreOccupants: "",
  elementsParticuliers: [] as string[],
  // Tri-état volontaire ("" = pas encore répondu) : un booléen ne peut pas
  // distinguer « non » d'« aucune réponse », et afficherait donc « Non »
  // comme s'il avait été choisi.
  orienteParAgent: "",
  codeCommissionnaire: "",
  autresInfos: "",
}

// v2 : la forme du brouillon a changé (localisation structurée, budget
// min/max). Un brouillon v1 restauré mélangerait les deux formats.
const DRAFT_KEY = "nbn-demande-location-v2"

const needsOther = (value: string, other: string) => value === "AUTRE" && !other.trim()

export default function DemandeLocationPage() {
  const { value: form, setValue: setForm, clear, restored } = useFormDraft(DRAFT_KEY, EMPTY_FORM)
  const [conditionsAccepted, setConditionsAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<{ dossierNumber: string | null } | null>(null)

  const set = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const inBukavu = form.ville === "BUKAVU"

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const payload: RentalRequestPayload = {
        fullName: form.fullName.trim(),
        phone: normalizePhone(form.phone) ?? form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        conditionsAccepted: true,
        lieuProvenance: form.lieuProvenance.trim() || undefined,
        residenceActuelle: form.residenceActuelle.trim() || undefined,
        sexe: form.sexe || undefined,
        typeClient: form.typeClient || undefined,
        canalContact: form.canalContact,
        canalContactAutre: form.canalContactAutre.trim() || undefined,
        typesBien: form.typesBien,
        typeBienAutre: form.typeBienAutre.trim() || undefined,
        usageBien: form.usageBien,
        ville: form.ville,
        villeAutre: form.villeAutre.trim() || undefined,
        commune: inBukavu ? form.location.commune : undefined,
        quartier: inBukavu ? form.location.quartier : form.quartierLibre.trim(),
        avenues: inBukavu ? resolveAvenues(form.location).join(", ") : form.avenuesLibres.trim(),
        budgetMin: Number(form.budgetMin),
        loyerMax: Number(form.budgetMax),
        devise: form.devise || undefined,
        modalitePaiement: form.modalitePaiement,
        modalitePaiementAutre: form.modalitePaiementAutre.trim() || undefined,
        chargesIncluses: form.chargesIncluses || undefined,
        nombreChambres: form.nombreChambres || undefined,
        nombreChambresAutre: form.nombreChambresAutre.trim() || undefined,
        nombreSalons: form.nombreSalons || undefined,
        nombreToilettes: form.nombreToilettes || undefined,
        equipements: form.equipements.length ? form.equipements : undefined,
        avantages: form.avantages.length ? form.avantages : undefined,
        avantageAutre: form.avantageAutre.trim() || undefined,
        urgence: form.urgence,
        urgenceAutre: form.urgenceAutre.trim() || undefined,
        dateEntree: form.dateEntree || undefined,
        typeOccupants: form.typeOccupants,
        nombreOccupants:
          form.typeOccupants === "AUTRE" && form.nombreOccupants ? Number(form.nombreOccupants) : undefined,
        elementsParticuliers: form.elementsParticuliers,
        orienteParAgent: form.orienteParAgent === "OUI",
        codeCommissionnaire:
          form.orienteParAgent === "OUI"
            ? normalizeCommissionnaireCode(form.codeCommissionnaire) ?? form.codeCommissionnaire.trim()
            : undefined,
        autresInfos: form.autresInfos.trim() || undefined,
      }

      const result = await submitRentalRequest(payload)
      clear()
      setSubmitted({ dossierNumber: result.dossierNumber })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps: WizardStep[] = [
    {
      id: "identite",
      title: "Parlons de vous",
      subtitle: "Vos coordonnées nous permettent de vous répondre et de vous envoyer un accusé de réception.",
      validate: () => {
        if (!form.fullName.trim()) return "Merci d'indiquer votre nom complet."
        if (!normalizePhone(form.phone)) return "Numéro de téléphone invalide. Exemple : +243 977 103 143."
        if (!isEmailFormatValid(form.email)) return "Merci d'indiquer une adresse e-mail valide."
        if (!form.canalContact) return "Dites-nous comment vous nous avez connus."
        if (needsOther(form.canalContact, form.canalContactAutre)) return "Précisez comment vous nous avez connus."
        return null
      },
      content: (
        <div className="space-y-5">
          <Field label="Nom complet" required>
            <TextField value={form.fullName} onChange={(v) => set("fullName", v)} placeholder="Ex. Jeanne Mukendi" />
          </Field>
          <Field label="Téléphone / WhatsApp" required>
            <TextField
              value={form.phone}
              onChange={(v) => set("phone", v)}
              type="tel"
              placeholder="+243 ..."
              inputMode="tel"
              autoComplete="tel"
            />
          </Field>
          <Field label="Adresse e-mail" required hint="Vous y recevrez l'accusé de réception de votre demande.">
            <TextField
              value={form.email}
              onChange={(v) => set("email", v)}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="exemple@gmail.com"
            />
          </Field>
          <Field label="Lieu de provenance">
            <TextField value={form.lieuProvenance} onChange={(v) => set("lieuProvenance", v)} />
          </Field>
          <Field label="Résidence actuelle">
            <TextField value={form.residenceActuelle} onChange={(v) => set("residenceActuelle", v)} />
          </Field>
          <Field label="Sexe">
            <ChoiceChips choices={SEXE_CHOICES} value={form.sexe} onChange={(v) => set("sexe", v)} />
          </Field>
          <Field label="Type de client">
            <ChoiceChips choices={TYPE_CLIENT_CHOICES} value={form.typeClient} onChange={(v) => set("typeClient", v)} />
          </Field>
          <Field label="Comment nous avez-vous connus ?" required>
            <ChoiceChips
              choices={CANAL_CONTACT_CHOICES}
              value={form.canalContact}
              onChange={(v) => set("canalContact", v)}
              otherValue="AUTRE"
              otherText={form.canalContactAutre}
              onOtherTextChange={(v) => set("canalContactAutre", v)}
            />
          </Field>
        </div>
      ),
    },
    {
      id: "type-location",
      title: "Que recherchez-vous ?",
      subtitle: "Vous pouvez sélectionner plusieurs types de biens.",
      validate: () => {
        if (form.typesBien.length === 0) return "Choisissez au moins un type de bien."
        if (form.typesBien.includes("AUTRE") && !form.typeBienAutre.trim()) return "Précisez le type de bien."
        if (!form.usageBien) return "Indiquez l'usage du bien."
        return null
      },
      content: (
        <div className="space-y-5">
          <Field label="Type de bien souhaité" required>
            <MultiChoiceChips
              choices={TYPE_BIEN_SOUHAITE_CHOICES}
              values={form.typesBien}
              onChange={(v) => set("typesBien", v)}
              otherValue="AUTRE"
              otherText={form.typeBienAutre}
              onOtherTextChange={(v) => set("typeBienAutre", v)}
            />
          </Field>
          <Field label="Usage du bien" required>
            <ChoiceChips choices={USAGE_BIEN_CHOICES} value={form.usageBien} onChange={(v) => set("usageBien", v)} />
          </Field>
        </div>
      ),
    },
    {
      id: "milieu",
      title: "Dans quel milieu ?",
      subtitle: "Plus vous êtes précis, plus nos propositions seront pertinentes.",
      validate: () => {
        if (!form.ville) return "Indiquez la ville souhaitée."
        if (needsOther(form.ville, form.villeAutre)) return "Précisez la ville souhaitée."
        if (inBukavu) return validateLocation(form.location)
        if (!form.quartierLibre.trim()) return "Indiquez le quartier souhaité."
        if (!form.avenuesLibres.trim()) return "Indiquez au moins une avenue souhaitée."
        return null
      },
      content: (
        <div className="space-y-5">
          <Field label="Ville" required>
            <ChoiceChips
              choices={VILLE_CHOICES}
              value={form.ville}
              onChange={(v) => set("ville", v)}
              otherValue="AUTRE"
              otherText={form.villeAutre}
              onOtherTextChange={(v) => set("villeAutre", v)}
              otherPlaceholder="Quelle ville ?"
            />
          </Field>
          {inBukavu && (
            <LocationFields
              value={form.location}
              onChange={(v) => set("location", v)}
              multipleAvenues
              required
              avenueLabel="Quelle(s) avenue(s) préférez-vous ?"
            />
          )}
          {form.ville === "AUTRE" && (
            <>
              <Field label="Quartier souhaité" required>
                <TextField value={form.quartierLibre} onChange={(v) => set("quartierLibre", v)} />
              </Field>
              <Field label="Quelle(s) avenue(s) préférez-vous ?" required>
                <TextField value={form.avenuesLibres} onChange={(v) => set("avenuesLibres", v)} />
              </Field>
            </>
          )}
        </div>
      ),
    },
    {
      id: "budget",
      title: "Votre budget",
      subtitle: "Ces informations nous évitent de vous proposer des biens hors de portée.",
      validate: () => {
        const min = Number(form.budgetMin)
        const max = Number(form.budgetMax)
        if (!(min > 0)) return "Indiquez votre budget minimum."
        if (!(max > 0)) return "Indiquez votre budget maximum."
        if (min > max) return "Le budget minimum ne peut pas dépasser le budget maximum."
        if (!form.modalitePaiement) return "Choisissez la modalité de paiement."
        if (needsOther(form.modalitePaiement, form.modalitePaiementAutre)) return "Précisez la modalité de paiement."
        return null
      },
      content: (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Budget minimum" required>
              <TextField
                value={form.budgetMin}
                onChange={(v) => set("budgetMin", v)}
                type="number"
                inputMode="numeric"
                placeholder="Ex. 150"
              />
            </Field>
            <Field label="Budget maximum" required>
              <TextField
                value={form.budgetMax}
                onChange={(v) => set("budgetMax", v)}
                type="number"
                inputMode="numeric"
                placeholder="Ex. 300"
              />
            </Field>
          </div>
          <ChoiceChips choices={DEVISE_CHOICES} value={form.devise} onChange={(v) => set("devise", v || "USD")} />
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
          <Field
            label="Charges incluses ?"
            hint="Souhaitez-vous que certaines charges soient comprises dans le loyer ?"
          >
            <ChoiceChips
              choices={CHARGES_INCLUSES_CHOICES}
              value={form.chargesIncluses}
              onChange={(v) => set("chargesIncluses", v)}
            />
          </Field>
        </div>
      ),
    },
    {
      id: "caracteristiques",
      title: "Le bien idéal",
      subtitle: "Laissez vide ce qui vous est indifférent.",
      content: (
        <div className="space-y-5">
          <Field label="Nombre de chambres">
            <ChoiceChips
              choices={NOMBRE_CHAMBRES_CHOICES}
              value={form.nombreChambres}
              onChange={(v) => set("nombreChambres", v)}
              otherValue="AUTRE"
              otherText={form.nombreChambresAutre}
              onOtherTextChange={(v) => set("nombreChambresAutre", v)}
            />
          </Field>
          <Field label="Nombre de salons">
            <ChoiceChips
              choices={NOMBRE_SALONS_CHOICES}
              value={form.nombreSalons}
              onChange={(v) => set("nombreSalons", v)}
            />
          </Field>
          <Field label="Nombre de toilettes">
            <ChoiceChips
              choices={NOMBRE_TOILETTES_CHOICES}
              value={form.nombreToilettes}
              onChange={(v) => set("nombreToilettes", v)}
            />
          </Field>
          <Field label="Équipements">
            <MultiChoiceChips
              choices={EQUIPEMENT_CHOICES}
              values={form.equipements}
              onChange={(v) => set("equipements", v)}
            />
          </Field>
          <Field label="Avantages souhaités">
            <MultiChoiceChips
              choices={AVANTAGE_CHOICES}
              values={form.avantages}
              onChange={(v) => set("avantages", v)}
              otherValue="AUTRE"
              otherText={form.avantageAutre}
              onOtherTextChange={(v) => set("avantageAutre", v)}
            />
          </Field>
        </div>
      ),
    },
    {
      id: "disponibilite",
      title: "Pour quand ?",
      validate: () => {
        if (!form.urgence) return "Indiquez l'urgence de votre recherche."
        if (needsOther(form.urgence, form.urgenceAutre)) return "Précisez l'urgence."
        return null
      },
      content: (
        <div className="space-y-5">
          <Field label="Urgence" required>
            <ChoiceChips
              choices={URGENCE_CHOICES}
              value={form.urgence}
              onChange={(v) => set("urgence", v)}
              otherValue="AUTRE"
              otherText={form.urgenceAutre}
              onOtherTextChange={(v) => set("urgenceAutre", v)}
            />
          </Field>
          <Field label="Date d'entrée souhaitée">
            <TextField value={form.dateEntree} onChange={(v) => set("dateEntree", v)} type="date" />
          </Field>
        </div>
      ),
    },
    {
      id: "complements",
      title: "Quelques précisions",
      subtitle: "Ces détails nous aident à vous proposer un logement réellement adapté.",
      validate: () => {
        if (!form.typeOccupants) return "Indiquez qui occupera le logement."
        if (form.typeOccupants === "AUTRE" && !(Number(form.nombreOccupants) >= 1)) {
          return "Précisez le nombre d'occupants."
        }
        if (form.elementsParticuliers.length === 0) {
          return "Indiquez les éléments à prendre en compte, ou « Aucune »."
        }
        if (!form.orienteParAgent) return "Indiquez si vous avez été orienté par un agent ou un commissionnaire."
        if (form.orienteParAgent === "OUI" && !normalizeCommissionnaireCode(form.codeCommissionnaire)) {
          return "Le code commissionnaire est requis, au format CCM-042."
        }
        return null
      },
      content: (
        <div className="space-y-5">
          <Field label="Nombre d'occupants" required hint="Nous permet de proposer un logement adapté à la taille de votre ménage.">
            <div className="space-y-2">
              <ChoiceChips
                choices={TYPE_OCCUPANTS_CHOICES}
                value={form.typeOccupants}
                onChange={(v) => set("typeOccupants", v)}
              />
              {form.typeOccupants === "AUTRE" && (
                <TextField
                  value={form.nombreOccupants}
                  onChange={(v) => set("nombreOccupants", v)}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="Combien de personnes ?"
                />
              )}
            </div>
          </Field>
          <Field
            label="Éléments à prendre en compte"
            required
            hint="Tout ce qui pourrait influencer l'acceptation du logement (animaux, activité, etc.)."
          >
            <MultiChoiceChips
              choices={ELEMENT_PARTICULIER_CHOICES}
              values={form.elementsParticuliers}
              onChange={(v) => set("elementsParticuliers", v)}
            />
          </Field>
          <Field label="Avez-vous été orienté par un agent ou commissionnaire partenaire ?" required>
            <div className="space-y-2">
              <ChoiceChips
                choices={[
                  { value: "OUI", label: "Oui" },
                  { value: "NON", label: "Non" },
                ]}
                value={form.orienteParAgent}
                onChange={(v) => set("orienteParAgent", v)}
              />
              {form.orienteParAgent === "OUI" && (
                <TextField
                  value={form.codeCommissionnaire}
                  onChange={(v) => set("codeCommissionnaire", v)}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Code commissionnaire (ex. CCM-042)"
                />
              )}
            </div>
          </Field>
          <Field label="Autre chose à nous signaler ?">
            <TextAreaField
              value={form.autresInfos}
              onChange={(v) => set("autresInfos", v)}
              placeholder="Toute information utile pour mieux comprendre votre besoin."
            />
          </Field>
        </div>
      ),
    },
    {
      id: "conditions",
      title: "Conditions & engagement",
      subtitle: "Dernière étape — merci de lire et d'accepter avant d'envoyer.",
      validate: () => (conditionsAccepted ? null : "Vous devez accepter les conditions pour envoyer votre demande."),
      content: (
        <div className="space-y-5">
          <div className="max-h-72 space-y-4 overflow-y-auto rounded-lg border border-border bg-muted/40 p-4">
            {CONDITIONS.map((condition, index) => (
              <div key={condition.title} className="space-y-1">
                <p className="text-sm font-semibold">
                  {index + 1}. {condition.title}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{condition.body}</p>
              </div>
            ))}
          </div>
          <label
            htmlFor="accept-conditions"
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/40"
          >
            <Checkbox
              id="accept-conditions"
              checked={conditionsAccepted}
              onCheckedChange={(checked) => setConditionsAccepted(checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor="accept-conditions" className="cursor-pointer font-normal leading-relaxed">
              J&apos;ai lu et j&apos;accepte les conditions ci-dessus.
            </Label>
          </label>
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
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Demande bien reçue</h1>
                <p className="text-muted-foreground leading-relaxed">
                  Merci ! Notre équipe étudie votre demande et vous recontacte au numéro que vous avez indiqué.
                </p>
              </div>
              {submitted.dossierNumber && (
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Votre numéro de dossier</p>
                  <p className="font-mono text-lg font-semibold">{submitted.dossierNumber}</p>
                </div>
              )}
              <Button asChild className="h-12 w-full bg-accent-600 text-white hover:bg-accent-600/90">
                <Link href="/">Retour à l&apos;accueil</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="space-y-3">
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Dites-nous ce que vous cherchez
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Quelques questions pour comprendre votre besoin. Comptez 3 à 4 minutes — vos réponses sont
                enregistrées au fur et à mesure, vous pouvez revenir plus tard.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0 text-secondary-600" />
                Vos informations restent confidentielles et ne servent qu&apos;à votre recherche.
              </div>
            </div>

            {restored && (
              <FormWizard
                steps={steps}
                onSubmit={handleSubmit}
                submitLabel="Envoyer ma demande"
                isSubmitting={isSubmitting}
                draftKey={DRAFT_KEY}
                onClearDraft={() => {
                  clear()
                  setConditionsAccepted(false)
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
