"use client"

import type React from "react"
import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { createCommissionnaire, previewNextCommissionnaireCode } from "@/actions/commissionnaires"
import { IdDocumentPicker } from "@/components/forms/id-document-picker"
import {
  FIELD_AGENT_PROFIL_LABELS,
  ID_DOCUMENT_TYPE_LABELS,
  type Commissionnaire,
  type FieldAgentProfil,
  type IdDocumentType,
} from "@/lib/types"
import { normalizePhone } from "@/lib/contactValidation"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface AddCommissionnaireModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (commissionnaire: Commissionnaire) => void
}

const EMPTY = {
  profil: "COMMISSIONNAIRE" as FieldAgentProfil,
  fullName: "",
  phone: "",
  zone: "",
  idDocumentType: "CARTE_ELECTEUR" as IdDocumentType,
  idNumber: "",
}

// Fiche digitale terrain (CDC §7). Le code est généré par le serveur à
// l'enregistrement ; l'aperçu « Sera généré » peut avancer si quelqu'un
// d'autre ajoute une fiche entre-temps.
export function AddCommissionnaireModal({ open, onOpenChange, onAdd }: AddCommissionnaireModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [recto, setRecto] = useState<File | null>(null)
  const [verso, setVerso] = useState<File | null>(null)
  const [nextCode, setNextCode] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setNextCode(null)
    previewNextCommissionnaireCode(form.profil).then(setNextCode)
  }, [open, form.profil])

  const reset = () => {
    setForm(EMPTY)
    setRecto(null)
    setVerso(null)
  }

  const phoneInvalid = form.phone.trim() !== "" && !normalizePhone(form.phone)
  const canSubmit = form.fullName.trim() && form.idNumber.trim() && recto && !phoneInvalid && !isLoading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setIsLoading(true)
    try {
      const { data, message } = await createCommissionnaire(
        {
          profil: form.profil,
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || undefined,
          zone: form.zone.trim() || undefined,
          idDocumentType: form.idDocumentType,
          idNumber: form.idNumber.trim(),
        },
        { recto, verso }
      )
      onAdd(data)
      onOpenChange(false)
      reset()
      toast.success(message || `Code attribué : ${data.code}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  const choice = (active: boolean) =>
    cn(
      "flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
      active ? "border-primary-900 bg-primary-900 text-white" : "border-border hover:bg-muted"
    )

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset()
        onOpenChange(value)
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un {form.profil === "COLLECTEUR" ? "collecteur" : "commissionnaire"}</DialogTitle>
          <DialogDescription>Nouvelle fiche digitale terrain. Les champs marqués * sont obligatoires.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-2" role="radiogroup" aria-label="Profil">
            {(Object.keys(FIELD_AGENT_PROFIL_LABELS) as FieldAgentProfil[]).map((profil) => (
              <button
                key={profil}
                type="button"
                role="radio"
                aria-checked={form.profil === profil}
                className={choice(form.profil === profil)}
                onClick={() => setForm({ ...form, profil })}
              >
                {FIELD_AGENT_PROFIL_LABELS[profil]}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cmr-fullName">Nom complet *</Label>
            <Input
              id="cmr-fullName"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              autoComplete="name"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cmr-code">Code</Label>
              <Input id="cmr-code" value={nextCode ? `Sera généré : ${nextCode}` : "Généré à l'ajout"} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cmr-zone">Zone</Label>
              <Input
                id="cmr-zone"
                placeholder="Ibanda"
                value={form.zone}
                onChange={(e) => setForm({ ...form, zone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cmr-phone">Téléphone</Label>
            <Input
              id="cmr-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+243 999 999 999"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              aria-invalid={phoneInvalid}
            />
            {phoneInvalid && <p className="text-sm text-error-500">Numéro de téléphone invalide.</p>}
          </div>

          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold">Pièce d&apos;identité</legend>
            <div className="space-y-2">
              <Label>Type de pièce *</Label>
              <div className="flex gap-2" role="radiogroup" aria-label="Type de pièce">
                {(Object.keys(ID_DOCUMENT_TYPE_LABELS) as IdDocumentType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={form.idDocumentType === type}
                    className={choice(form.idDocumentType === type)}
                    onClick={() => setForm({ ...form, idDocumentType: type })}
                  >
                    {ID_DOCUMENT_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                La carte d&apos;électeur est privilégiée ; la carte d&apos;identité est acceptée à défaut.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cmr-idNumber">Numéro de la pièce *</Label>
              <Input
                id="cmr-idNumber"
                value={form.idNumber}
                onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                autoCapitalize="characters"
                required
              />
            </div>
            <IdDocumentPicker label="Recto" required file={recto} onChange={setRecto} />
            <IdDocumentPicker label="Verso (facultatif)" file={verso} onChange={setVerso} />
          </fieldset>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-primary-900 text-white hover:bg-primary-700" disabled={!canSubmit}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ajout...
                </>
              ) : (
                "Ajouter"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
