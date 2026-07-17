"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import {
  PROPERTY_STATUT_BADGE_CLASS,
  PROPERTY_STATUT_LABELS,
  type Property,
  type PropertyStatut,
} from "@/lib/types"
import { updatePropertyStatut } from "@/actions/properties"

const ALL_STATUTS: PropertyStatut[] = [
  "DISPONIBLE",
  "OCCUPE_CLIENT_NBN",
  "OCCUPE_CLIENT_EXTERNE",
  "EN_MAINTENANCE",
  "VENDU",
]

interface PropertyStatutControlProps {
  property: Property
  onChanged: (updated: Property) => void
}

// GOAL 1 — contrôle réutilisable (fiches location/vente) pour le seul
// point d'entrée de changement de statut (PATCH /:id/statut, jamais via
// la modale d'édition générique).
export function PropertyStatutControl({ property, onChanged }: PropertyStatutControlProps) {
  const [open, setOpen] = useState(false)
  const [statut, setStatut] = useState<PropertyStatut>(property.statut)
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const availableStatuts = ALL_STATUTS.filter(
    (s) => s !== "VENDU" || property.category === "SALE"
  )

  const handleOpen = () => {
    setStatut(property.statut)
    setNote("")
    setOpen(true)
  }

  const handleSubmit = async () => {
    if (statut === property.statut) {
      toast.error("Ce bien a déjà ce statut.")
      return
    }
    setSubmitting(true)
    try {
      const updated = await updatePropertyStatut(property.idProperty, statut, note.trim() || undefined)
      onChanged(updated)
      toast.success("Statut mis à jour avec succès")
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button type="button" onClick={handleOpen} className="group inline-flex items-center gap-1.5">
        <Badge className={PROPERTY_STATUT_BADGE_CLASS[property.statut]}>
          {PROPERTY_STATUT_LABELS[property.statut]}
        </Badge>
        <RefreshCw className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le statut du bien</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nouveau statut</Label>
              <Select value={statut} onValueChange={(v) => setStatut(v as PropertyStatut)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuts.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROPERTY_STATUT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note (optionnelle)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Raison du changement, contexte utile pour l'historique..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Mise à jour..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
