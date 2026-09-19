"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, FileCheck2, Loader2, Paperclip } from "lucide-react"
import { createBailleur } from "@/actions/bailleurs"
import { UnassignedPropertyPicker } from "@/components/unassigned-property-picker"
import { isEmailFormatValid, normalizePhone } from "@/lib/contactValidation"
import { prefillCollecteForBailleur } from "@/lib/collectePrefill"
import {
  BAILLEUR_PRIORITE_LABELS,
  BAILLEUR_PRIORITES,
  BAILLEUR_TYPE_LABELS,
  type Bailleur,
  type BailleurPriorite,
  type BailleurType,
} from "@/lib/types"
import { toast } from "sonner"

interface AddBailleurModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (bailleur: Bailleur) => void
}

const MAX_ID_DOCUMENT_BYTES = 8 * 1024 * 1024

const EMPTY = {
  fullName: "",
  phone: "",
  email: "",
  idNumber: "",
  type: "" as BailleurType | "",
  priorite: "STANDARD" as BailleurPriorite,
}

// « Ajouter un Bailleur » en deux étapes : identité (pièce d'identité
// obligatoire), puis ses biens — déjà dans la galerie, ou à collecter.
export function AddBailleurModal({ open, onOpenChange, onAdd }: AddBailleurModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<"identite" | "biens">("identite")
  const [form, setForm] = useState(EMPTY)
  const [pieceIdentite, setPieceIdentite] = useState<File | null>(null)
  const [idProperties, setIdProperties] = useState<number[]>([])
  const [collectAfter, setCollectAfter] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const reset = () => {
    setStep("identite")
    setForm(EMPTY)
    setPieceIdentite(null)
    setIdProperties([])
    setCollectAfter(false)
  }

  const identityError = () => {
    if (!form.fullName.trim()) return "Le nom du bailleur est requis."
    if (!normalizePhone(form.phone)) return "Le téléphone est requis et doit être valide."
    if (form.email.trim() && !isEmailFormatValid(form.email)) return "L'adresse e-mail n'est pas valide."
    if (!form.type) return "Choisissez le statut du responsable."
    if (!pieceIdentite) return "La pièce d'identité est obligatoire."
    if (pieceIdentite.size > MAX_ID_DOCUMENT_BYTES) return "La pièce d'identité dépasse 8 Mo."
    return null
  }

  const goToProperties = () => {
    const error = identityError()
    if (error) return toast.error(error)
    setStep("biens")
  }

  const handleCreate = async () => {
    if (!pieceIdentite || !form.type) return
    setIsLoading(true)
    try {
      const created = await createBailleur(
        {
          fullName: form.fullName.trim(),
          phone: normalizePhone(form.phone) ?? form.phone.trim(),
          email: form.email.trim() || undefined,
          idNumber: form.idNumber.trim() || undefined,
          type: form.type,
          priorite: form.priorite,
          idProperties,
        },
        pieceIdentite
      )
      onAdd(created)
      toast.success(
        idProperties.length
          ? `Bailleur ajouté avec ${idProperties.length} bien(s) rattaché(s)`
          : "Bailleur ajouté"
      )
      onOpenChange(false)
      reset()
      if (collectAfter) {
        prefillCollecteForBailleur(created)
        router.push("/collecte-bien")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un bailleur</DialogTitle>
          <DialogDescription>
            {step === "identite" ? "Étape 1 sur 2 — Identité du bailleur" : "Étape 2 sur 2 — Ses biens"}
          </DialogDescription>
        </DialogHeader>

        {step === "identite" ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Statut du responsable *</Label>
                <Select value={form.type} onValueChange={(value: BailleurType) => set("type", value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(BAILLEUR_TYPE_LABELS) as BailleurType[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {BAILLEUR_TYPE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select value={form.priorite} onValueChange={(value: BailleurPriorite) => set("priorite", value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BAILLEUR_PRIORITES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {BAILLEUR_PRIORITE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-name">
                {form.type === "SOCIETE" ? "Nom de la société / de l'établissement" : "Nom complet"} *
              </Label>
              <Input id="add-name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="add-phone">Téléphone *</Label>
                <Input
                  id="add-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+243 ..."
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-email">E-mail</Label>
                <Input
                  id="add-email"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-id-number">N° de pièce d&apos;identité</Label>
              <Input id="add-id-number" value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pièce d&apos;identité (annexe) *</Label>
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
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground hover:text-foreground">
                  <Paperclip className="h-4 w-4" />
                  Photo ou PDF de la pièce d&apos;identité
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="sr-only"
                    onChange={(e) => setPieceIdentite(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
              <p className="text-xs text-muted-foreground">Stockée de façon confidentielle, visible par l&apos;administration.</p>
            </div>
            <DialogFooter>
              <Button onClick={goToProperties} className="w-full bg-accent-600 text-white hover:bg-accent-600/90 sm:w-auto">
                Continuer
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Biens déjà dans la galerie qui lui appartiennent</Label>
              <UnassignedPropertyPicker selectedIds={idProperties} onChange={setIdProperties} />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm">
              <Checkbox checked={collectAfter} onCheckedChange={(checked) => setCollectAfter(checked === true)} className="mt-0.5" />
              <span>
                Collecter ensuite un <strong>nouveau bien</strong> pour ce bailleur
                <span className="block text-xs text-muted-foreground">
                  Le formulaire de collecte s&apos;ouvrira avec son identité déjà remplie.
                </span>
              </span>
            </label>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setStep("identite")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button onClick={handleCreate} disabled={isLoading} className="bg-accent-600 text-white hover:bg-accent-600/90">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer le bailleur
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
