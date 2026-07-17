"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Percent, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import type { Property } from "@/lib/types"
import { updatePropertyMarginOverride } from "@/actions/properties"

interface PropertyMarginControlProps {
  property: Property
  onChanged: (updated: Property) => void
}

// GOAL 9 — la marge est désormais toujours dérivée (price * pourcentage
// effectif) : ce contrôle ne modifie jamais `margin` directement, il agit
// uniquement sur `marginOverridePercentage` via le point d'entrée dédié
// (PATCH /:id/margin-override), même patron que PropertyStatutControl.
// N'est rendu que si `property.margin` est présent — le Backend a déjà
// décidé, via property:margin:read, si cet utilisateur peut voir la marge.
export function PropertyMarginControl({ property, onChanged }: PropertyMarginControlProps) {
  const [open, setOpen] = useState(false)
  const [percentage, setPercentage] = useState(
    property.marginOverridePercentage != null ? String(property.marginOverridePercentage) : ""
  )
  const [submitting, setSubmitting] = useState(false)

  if (property.margin === undefined) return null

  const hasOverride = property.marginOverridePercentage !== null && property.marginOverridePercentage !== undefined

  const handleOpen = () => {
    setPercentage(property.marginOverridePercentage != null ? String(property.marginOverridePercentage) : "")
    setOpen(true)
  }

  const handleSave = async () => {
    const numeric = Number(percentage)
    if (percentage === "" || Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
      toast.error("Le pourcentage doit être un nombre entre 0 et 100.")
      return
    }
    setSubmitting(true)
    try {
      const updated = await updatePropertyMarginOverride(property.idProperty, numeric)
      onChanged(updated)
      toast.success("Override de marge mis à jour")
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSubmitting(false)
    }
  }

  const handleClear = async () => {
    setSubmitting(true)
    try {
      const updated = await updatePropertyMarginOverride(property.idProperty, null)
      onChanged(updated)
      toast.success("Override retiré, retour au défaut du type")
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Marge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-3 rounded-lg bg-muted flex items-center justify-between flex-wrap gap-2">
          <span className="text-2xl font-bold">${Number(property.margin).toLocaleString()}</span>
          <Badge variant={hasOverride ? "default" : "secondary"}>
            {hasOverride ? `Override : ${property.marginOverridePercentage}%` : "Défaut du type"}
          </Badge>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
          <Percent className="h-4 w-4 mr-2" />
          {hasOverride ? "Modifier l'override" : "Définir un override"}
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override de marge pour ce bien</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Pourcentage (0-100)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              placeholder="Ex: 15"
            />
            <p className="text-sm text-muted-foreground">
              Prioritaire sur le pourcentage par défaut du type de bien. N&apos;affecte jamais les
              autres biens.
            </p>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {hasOverride && (
              <Button variant="ghost" onClick={handleClear} disabled={submitting}>
                Retirer l&apos;override
              </Button>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={submitting}>
                {submitting ? "Enregistrement..." : "Confirmer"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
