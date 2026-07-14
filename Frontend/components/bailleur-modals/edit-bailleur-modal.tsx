"use client"

import type React from "react"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { updateBailleur } from "@/actions/bailleurs"
import type {
  Bailleur,
  BailleurFiabilite,
  BailleurStatutRelation,
  BailleurValeur,
} from "@/lib/types"
import { toast } from "sonner"

interface EditBailleurModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bailleur: Bailleur | null
  onEdit: (bailleur: Bailleur) => void
}

export function EditBailleurModal({ open, onOpenChange, bailleur, onEdit }: EditBailleurModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [statutRelation, setStatutRelation] = useState<BailleurStatutRelation>("ACTIF")
  const [fiabilite, setFiabilite] = useState<BailleurFiabilite | "">("")
  const [valeurBailleur, setValeurBailleur] = useState<BailleurValeur | "">("")
  const [margeAgence, setMargeAgence] = useState("")
  const [notes, setNotes] = useState("")

  // Le champ marge n'est affiché que si le Backend l'a réellement renvoyé
  // (field-level authorization, bailleur:marge:read) — jamais présumer un
  // droit d'édition à partir d'un champ absent.
  const canSeeMarge = bailleur?.margeAgence !== undefined

  useEffect(() => {
    if (bailleur) {
      setStatutRelation(bailleur.statutRelation)
      setFiabilite(bailleur.fiabilite || "")
      setValeurBailleur(bailleur.valeurBailleur || "")
      setMargeAgence(bailleur.margeAgence?.toString() || "")
      setNotes(bailleur.notes || "")
    }
  }, [bailleur])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bailleur) return

    setIsLoading(true)
    try {
      const updated = await updateBailleur(bailleur.idBailleur, {
        statutRelation,
        fiabilite: fiabilite || undefined,
        valeurBailleur: valeurBailleur || undefined,
        margeAgence: canSeeMarge && margeAgence ? Number.parseFloat(margeAgence) : undefined,
        notes: notes || undefined,
      })
      onEdit(updated)
      onOpenChange(false)
      toast.success("Bailleur mis à jour avec succès")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  if (!bailleur) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le bailleur</DialogTitle>
          <DialogDescription>{bailleur.person?.fullName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Statut de la relation</Label>
              <Select
                value={statutRelation}
                onValueChange={(value: BailleurStatutRelation) => setStatutRelation(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIF">Actif</SelectItem>
                  <SelectItem value="INACTIF">Inactif</SelectItem>
                  <SelectItem value="A_RELANCER">À relancer</SelectItem>
                  <SelectItem value="SUSPENDU">Suspendu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fiabilité</Label>
              <Select value={fiabilite} onValueChange={(value: BailleurFiabilite) => setFiabilite(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Non évalué" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SERIEUX">Sérieux</SelectItem>
                  <SelectItem value="MOYEN">Moyen</SelectItem>
                  <SelectItem value="DIFFICILE">Difficile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Valeur du bailleur</Label>
              <Select
                value={valeurBailleur}
                onValueChange={(value: BailleurValeur) => setValeurBailleur(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Non évalué" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FAIBLE">Faible</SelectItem>
                  <SelectItem value="MOYEN">Moyen</SelectItem>
                  <SelectItem value="FORT">Fort</SelectItem>
                  <SelectItem value="PARTENAIRE_CLE">Partenaire clé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canSeeMarge && (
              <div className="space-y-2">
                <Label htmlFor="margeAgence">Marge agence ($)</Label>
                <Input
                  id="margeAgence"
                  type="number"
                  min="0"
                  value={margeAgence}
                  onChange={(e) => setMargeAgence(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
