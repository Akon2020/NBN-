"use client"

import { useState } from "react"
import { Eye, FileWarning, IdCard, Loader2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IdDocumentPicker } from "@/components/forms/id-document-picker"
import {
  openCommissionnaireIdentityDocument,
  replaceCommissionnaireIdentityDocument,
} from "@/actions/commissionnaires"
import { ID_DOCUMENT_TYPE_LABELS, type Commissionnaire, type IdDocumentType } from "@/lib/types"
import { toast } from "sonner"

// Pièce d'identité d'un commissionnaire ou d'un collecteur. Consultation et
// remplacement réservés par le Backend à commissionnaires:identity:read :
// un refus s'affiche simplement en message.
export function CommissionnaireIdentityCard({
  commissionnaire,
  onUpdated,
}: {
  commissionnaire: Commissionnaire
  onUpdated: (updated: Commissionnaire) => void
}) {
  const person = commissionnaire.person
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<IdDocumentType>(person?.idDocumentType ?? "CARTE_ELECTEUR")
  const [idNumber, setIdNumber] = useState("")
  const [recto, setRecto] = useState<File | null>(null)
  const [verso, setVerso] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const view = async (face: "recto" | "verso") => {
    try {
      await openCommissionnaireIdentityDocument(commissionnaire.idCommissionnaire, face)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pièce indisponible")
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const updated = await replaceCommissionnaireIdentityDocument(
        commissionnaire.idCommissionnaire,
        { idDocumentType: type, idNumber: idNumber.trim() || undefined },
        { recto, verso }
      )
      onUpdated(updated)
      toast.success("Pièce d'identité enregistrée")
      setOpen(false)
      setRecto(null)
      setVerso(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <IdCard className="h-4 w-4" aria-hidden />
          Pièce d&apos;identité
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {person?.hasIdDocument ? (
          <>
            <p>
              {person.idDocumentType ? ID_DOCUMENT_TYPE_LABELS[person.idDocumentType] : "Pièce enregistrée"}
              {person.idNumber ? `, N° ${person.idNumber}` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => view("recto")}>
                <Eye className="mr-2 h-4 w-4" />
                Recto
              </Button>
              {person.hasIdDocumentVerso && (
                <Button size="sm" variant="outline" onClick={() => view("verso")}>
                  <Eye className="mr-2 h-4 w-4" />
                  Verso
                </Button>
              )}
            </div>
          </>
        ) : (
          <Badge className="bg-warning-500 text-neutral-900">
            <FileWarning className="mr-1 h-3.5 w-3.5" aria-hidden />
            Pièce manquante
          </Badge>
        )}
        <Button size="sm" variant="ghost" className="-ml-2" onClick={() => setOpen(true)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {person?.hasIdDocument ? "Remplacer la pièce" : "Ajouter la pièce"}
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pièce d&apos;identité</DialogTitle>
            <DialogDescription>{person?.fullName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2" role="radiogroup" aria-label="Type de pièce">
              {(Object.keys(ID_DOCUMENT_TYPE_LABELS) as IdDocumentType[]).map((value) => (
                <Button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={type === value}
                  variant={type === value ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setType(value)}
                >
                  {ID_DOCUMENT_TYPE_LABELS[value]}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="identity-number">Numéro de la pièce</Label>
              <Input
                id="identity-number"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder={person?.idNumber ?? ""}
              />
            </div>
            <IdDocumentPicker label="Recto" required={!person?.hasIdDocument} file={recto} onChange={setRecto} />
            <IdDocumentPicker label="Verso (facultatif)" file={verso} onChange={setVerso} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={save} disabled={saving || (!recto && !verso) || (!person?.hasIdDocument && !recto)}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
