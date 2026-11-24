"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Manrope, Inter } from "next/font/google"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, EyeOff, FileCheck2, Lock, Paperclip } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { BackButton } from "@/components/back-button"
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
  normalizeCollecteurCode,
  normalizeCommissionnaireCode,
  normalizePhone,
} from "@/lib/contactValidation"
import { AgentCodeField } from "@/components/forms/agent-code-field"
import { BailleurPicker } from "@/components/forms/bailleur-picker"
import type { FieldAgentLookup } from "@/actions/propertyCollections"
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
  BAILLEUR_PRIORITES,
  BAILLEUR_PRIORITE_LABELS,
  type PropertyCollectionPayload,
} from "@/lib/types"
import { toast } from "sonner"

const manrope = Manrope({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" })
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" })

const EMPTY_LOCATION: LocationValue = { commune: "", quartier: "", avenues: [], avenueAutre: "" }

const EMPTY_FORM = {
  // "RESPONSABLE" | "COLLECTEUR" | "COMMISSIONNAIRE"
  remplisseur: "",
  // Code CTR du collecteur, ou CMR du commissionnaire, qui remplit.
  codeRemplisseur: "",
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
  responsablePhone2: "",
  // Version de l'agence (membre connecté) : bailleur nouveau ou existant,
  // catégorie du bailleur.
  bailleurMode: "NOUVEAU",
  idBailleur: "",
  bailleurLabel: "",
  bailleurPriorite: "",
  responsableDisponibiliteVisite: "",
  responsableAccepteCommission: "",
  collecteurNom: "",
  collecteurPhone: "",
  codeCommissionnaire: "",
}

// v3 : trois cas « qui remplit » et codes vérifiés (CMR / CTR).
const DRAFT_KEY = "nbn-collecte-bien-v3"

// Aligné sur MAX_ID_DOCUMENT_SIZE_MB (8 Mo par défaut) côté Backend.
const MAX_ID_DOCUMENT_BYTES = 8 * 1024 * 1024

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
  // Hors brouillon : un fichier ne se sauvegarde pas dans le navigateur. Un
  // brouillon restauré redemande donc la pièce à l'étape du responsable.
  const [pieceIdentite, setPieceIdentite] = useState<File | null>(null)

  const set = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // Fiches vérifiées en base pour le code de celui qui remplit, et pour le
  // commissionnaire qui a apporté le bien.
  const [remplisseurAgent, setRemplisseurAgent] = useState<FieldAgentLookup | null>(null)
  const [apporteurAgent, setApporteurAgent] = useState<FieldAgentLookup | null>(null)

  const parResponsable = form.remplisseur === "RESPONSABLE"
  const parLeCommissionnaire = form.remplisseur === "COMMISSIONNAIRE"
  // Dernière étape « Identité du commissionnaire » : bien apporté par un
  // commissionnaire, quand ce n'est pas lui qui remplit.
  const parCommissionnaire = !parLeCommissionnaire && form.remplisseur !== "" && form.parCommissionnaire === "OUI"
  const isRent = form.typeOperation === "RENT"
  // Membre de l'équipe connecté (hors commissionnaire) : version de
  // l'agence. Le Backend reste juge (bailleurs:manage) et répond 403 sinon.
  const [isStaff, setIsStaff] = useState(false)
  useEffect(() => {
    const user = getAuthUser()
    setIsStaff(Boolean(user && user.role !== "commissionnaire"))
  }, [])
  const existingBailleur = isStaff && form.bailleurMode === "EXISTANT"
  const countOf = (key: CountKey) => resolveCount(form[key], form[`${key}Autre`])

  // Préremplissage du commissionnaire quand la personne est connectée - la
  // saisie manuelle reste possible et prioritaire (un champ déjà rempli
  // par le brouillon n'est jamais écrasé).
  useEffect(() => {
    if (!restored || prefilled) return
    setPrefilled(true)

    // Commissionnaire ou collecteur connecté : son propre code, et le cas
    // « qui remplit » correspondant (le Backend n'accepte que le sien).
    getMyCommissionnaireCode().then((code) => {
      if (!code) return
      const remplisseur = code.startsWith("CTR") ? "COLLECTEUR" : "COMMISSIONNAIRE"
      setForm((prev) => (prev.remplisseur ? prev : { ...prev, remplisseur, codeRemplisseur: code }))
    })
    void getAuthUser
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
        codeCollecteur:
          form.remplisseur === "COLLECTEUR" ? normalizeCollecteurCode(form.codeRemplisseur) ?? undefined : undefined,
        codeRemplisseur: parLeCommissionnaire
          ? normalizeCommissionnaireCode(form.codeRemplisseur) ?? undefined
          : undefined,
        parCommissionnaire: parLeCommissionnaire ? undefined : form.parCommissionnaire === "OUI",
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
        ...(isStaff
          ? {
              bailleurPriorite: form.bailleurPriorite || undefined,
              responsablePhone2: form.responsablePhone2.trim() ? normalizePhone(form.responsablePhone2) ?? undefined : undefined,
              idBailleur: existingBailleur && form.idBailleur ? Number(form.idBailleur) : undefined,
            }
          : {}),
        responsableStatut: form.responsableStatut,
        responsableNom: form.responsableNom.trim(),
        responsablePhone: normalizePhone(form.responsablePhone) ?? form.responsablePhone.trim(),
        responsableEmail: form.responsableEmail.trim().toLowerCase(),
        responsableIdNumber: form.responsableIdNumber.trim() || undefined,
        responsableDisponibiliteVisite: form.responsableDisponibiliteVisite,
        responsableAccepteCommission: form.responsableAccepteCommission,
        // Nom et téléphone du commissionnaire : repris de sa fiche par le serveur.
        ...(parCommissionnaire
          ? { codeCommissionnaire: normalizeCommissionnaireCode(form.codeCommissionnaire) ?? form.codeCommissionnaire.trim() }
          : {}),
      }

      await submitPropertyCollection(payload, pieceIdentite)
      clear()
      setPieceIdentite(null)
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
      enregistrée - pas besoin de les avoir sous la main maintenant.
    </p>
  )

  const steps: WizardStep[] = [
    {
      id: "remplisseur",
      title: "Qui remplit ce formulaire ?",
      subtitle: "La suite du formulaire s'adapte à votre réponse.",
      validate: () => {
        if (!form.remplisseur) return "Indiquez qui remplit ce formulaire."
        // Un membre de l'équipe connecté peut collecter sans code collecteur.
        if (form.remplisseur === "COLLECTEUR" && !remplisseurAgent && !(isStaff && !form.codeRemplisseur.trim())) {
          return "Saisissez votre code collecteur (CTR-...) : il doit être vérifié avant de continuer."
        }
        if (parLeCommissionnaire && !remplisseurAgent) {
          return "Saisissez votre code commissionnaire (CMR-...) : il doit être vérifié avant de continuer."
        }
        if (!parLeCommissionnaire && !form.parCommissionnaire) {
          return "Indiquez si ce bien a été apporté par un commissionnaire."
        }
        return null
      },
      content: (
        <div className="space-y-5">
          <Field label="Vous êtes" required>
            <ChoiceChips
              choices={REMPLISSEUR_CHOICES}
              value={form.remplisseur}
              onChange={(v) => {
                setRemplisseurAgent(null)
                setForm((prev) => ({ ...prev, remplisseur: v, codeRemplisseur: v === prev.remplisseur ? prev.codeRemplisseur : "" }))
              }}
            />
          </Field>
          {parResponsable && (
            <p className="rounded-md bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
              Vous annexerez votre pièce d&apos;identité à l&apos;étape « Vous, responsable du bien ».
            </p>
          )}
          {form.remplisseur === "COLLECTEUR" && (
            <Field
              label="Votre code collecteur"
              required={!isStaff}
              hint={
                isStaff
                  ? "Facultatif pour un membre de l'équipe connecté."
                  : "Code attribué par l'agence, vérifié automatiquement."
              }
            >
              <AgentCodeField
                value={form.codeRemplisseur}
                onChange={(v) => set("codeRemplisseur", v)}
                normalize={normalizeCollecteurCode}
                placeholder="CTR-007"
                onVerified={setRemplisseurAgent}
              />
            </Field>
          )}
          {parLeCommissionnaire && (
            <Field label="Votre code commissionnaire" required hint="Code attribué par l'agence, vérifié automatiquement.">
              <AgentCodeField
                value={form.codeRemplisseur}
                onChange={(v) => set("codeRemplisseur", v)}
                normalize={normalizeCommissionnaireCode}
                placeholder="CMR-042"
                onVerified={setRemplisseurAgent}
              />
            </Field>
          )}
          {form.remplisseur && !parLeCommissionnaire && (
            <Field
              label="Ce bien a-t-il été apporté par un commissionnaire ?"
              required
              hint="Si oui, son code sera demandé à la dernière étape."
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
        if (existingBailleur) {
          return form.idBailleur ? null : "Choisissez le bailleur existant."
        }
        if (form.responsablePhone2.trim() && !normalizePhone(form.responsablePhone2)) {
          return "Le second téléphone n'est pas valide."
        }
        if (isStaff && !pieceIdentite) return "Annexez la pièce d'identité du bailleur."
        if (!form.responsableStatut) return "Indiquez le statut du responsable."
        if (!form.responsableNom.trim()) return "Le nom du responsable est requis."
        if (!normalizePhone(form.responsablePhone)) return "Le téléphone du responsable n'est pas valide."
        if (!form.responsableEmail.trim()) {
          return parResponsable ? "Votre adresse e-mail est requise." : "L'adresse e-mail du responsable est requise."
        }
        if (!isEmailFormatValid(form.responsableEmail)) {
          return "L'adresse e-mail n'est pas valide."
        }
        if (parResponsable && !pieceIdentite) return "Annexez votre pièce d'identité."
        if (pieceIdentite && pieceIdentite.size > MAX_ID_DOCUMENT_BYTES) {
          return "La pièce d'identité dépasse 8 Mo : prenez une photo moins lourde."
        }
        if (!form.responsableDisponibiliteVisite) return "Indiquez la disponibilité pour les visites."
        if (!form.responsableAccepteCommission) return "Indiquez la position sur la commission de l'agence."
        return null
      },
      content: (
        <div className="space-y-5">
          {isStaff && (
            <div className="space-y-4 rounded-xl border border-border bg-muted/40 p-4">
              <Field label="Profil du bailleur (agence)" required>
                <ChoiceChips
                  choices={[
                    { value: "NOUVEAU", label: "Nouveau bailleur" },
                    { value: "EXISTANT", label: "Bailleur existant" },
                  ]}
                  value={form.bailleurMode}
                  onChange={(v) => set("bailleurMode", v)}
                />
              </Field>
              {existingBailleur && (
                <>
                  <BailleurPicker
                    selectedId={form.idBailleur ? Number(form.idBailleur) : null}
                    onSelect={(bailleur) =>
                      setForm((prev) => ({
                        ...prev,
                        idBailleur: String(bailleur.idBailleur),
                        bailleurLabel: `${bailleur.person?.fullName ?? ""} (${bailleur.person?.phone ?? bailleur.dossierNumber})`,
                        bailleurPriorite: prev.bailleurPriorite || bailleur.priorite,
                      }))
                    }
                  />
                  {form.idBailleur && (
                    <p className="text-sm">
                      Bien rattaché à <strong>{form.bailleurLabel}</strong>. Son identité et sa pièce sont reprises de sa fiche.
                    </p>
                  )}
                </>
              )}
              <Field label="Catégorie du bailleur" hint="Ordre de la liste des bailleurs : VIP, PREMIUM, STANDARD, INACTIF.">
                <ChoiceChips
                  choices={BAILLEUR_PRIORITES.map((value) => ({ value, label: BAILLEUR_PRIORITE_LABELS[value] }))}
                  value={form.bailleurPriorite}
                  onChange={(v) => set("bailleurPriorite", v)}
                />
              </Field>
            </div>
          )}
          {!existingBailleur && (
          <>
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
          {isStaff && (
            <Field label="Second téléphone">
              <TextField
                value={form.responsablePhone2}
                onChange={(v) => set("responsablePhone2", v)}
                type="tel"
                inputMode="tel"
                placeholder="+243 ..."
              />
            </Field>
          )}
          <Field label="Adresse e-mail" required>
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
          <Field
            label={
              parResponsable
                ? "Annexer votre pièce d'identité"
                : isStaff
                  ? "Pièce d'identité du bailleur"
                  : "Pièce d'identité du responsable"
            }
            required={parResponsable || isStaff}
            hint={
              parResponsable
                ? "Une photo lisible ou un PDF. Elle reste confidentielle et n'est visible que par l'administration."
                : "Si vous avez pu la photographier. Confidentielle, visible uniquement par l'administration."
            }
          >
            {pieceIdentite ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <FileCheck2 className="h-4 w-4 shrink-0 text-secondary-600" />
                  <span className="truncate">{pieceIdentite.name}</span>
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPieceIdentite(null)}>
                  Retirer
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground hover:border-primary-900/40 hover:text-foreground">
                <Paperclip className="h-4 w-4" />
                Choisir une photo ou un PDF
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="sr-only"
                  onChange={(event) => setPieceIdentite(event.target.files?.[0] ?? null)}
                />
              </label>
            )}
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
          </>
          )}
          {!parCommissionnaire && mediaNote}
        </div>
      ),
    },
    ...(parCommissionnaire
      ? [
          {
            id: "commissionnaire",
            title: "Identité du commissionnaire",
            subtitle: "Son code suffit : nom et téléphone sont repris de sa fiche.",
            validate: () => {
              if (!normalizeCommissionnaireCode(form.codeCommissionnaire)) {
                return "Le code du commissionnaire est requis, au format CMR-042."
              }
              if (!apporteurAgent) return "Le code du commissionnaire doit être vérifié avant l'enregistrement."
              return null
            },
            content: (
              <div className="space-y-5">
                <Field label="Code du commissionnaire" required hint="Code CMR attribué par l'agence.">
                  <AgentCodeField
                    value={form.codeCommissionnaire}
                    onChange={(v) => set("codeCommissionnaire", v)}
                    normalize={normalizeCommissionnaireCode}
                    placeholder="CMR-042"
                    onVerified={setApporteurAgent}
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
        <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-2">
            <BackButton fallback="/" />
            <Link href="/" className="flex items-center gap-3" aria-label="Nyumbani Express, accueil">
              <Image src="/nyumbani-logo.png" alt="" width={120} height={40} className="h-10 w-auto" />
            </Link>
          </div>
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
                Usage interne - équipe, commissionnaires et responsables de biens
              </div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Collecte de bien
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Enregistrez un bien. Vos réponses sont sauvegardées au fur et à mesure - vous pouvez
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
