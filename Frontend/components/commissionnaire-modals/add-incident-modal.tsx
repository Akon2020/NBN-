"use client"

import type React from "react"

import { useState } from "react"
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
import { createIncident } from "@/actions/commissionnaires"
import type { Commissionnaire, IncidentGravite, IncidentType } from "@/lib/types"
import { toast } from "sonner"

interface AddIncidentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commissionnaire: Commissionnaire | null
  onAdded: (commissionnaire: Commissionnaire) => void
}

export function AddIncidentModal({ open, onOpenChange, commissionnaire, onAdded }: AddIncidentModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [type, setType] = useState<IncidentType>("RETARD")
  const [gravite, setGravite] = useState<IncidentGravite>("MINEUR")
  const [description, setDescription] = useState("")
  const [impactDiscipline, setImpactDiscipline] = useState("5")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commissionnaire) return

    setIsLoading(true)
    try {
      const { commissionnaire: updated } = await createIncident(commissionnaire.idCommissionnaire, {
        type,
        gravite,
        description: description || undefined,
        impactDiscipline: Number.parseFloat(impactDiscipline) || 0,
      })
      onAdded(updated)
      onOpenChange(false)
      setDescription("")
      setImpactDiscipline("5")
      toast.success("Incident enregistré")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  if (!commissionnaire) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer un incident</DialogTitle>
          <DialogDescription>
            Retard, données incomplètes, non-respect des règles (CDC §7) — impacte le score discipline.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(value: IncidentType) => setType(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RETARD">Retard</SelectItem>
                  <SelectItem value="DONNEES_INCOMPLETES">Données incomplètes</SelectItem>
                  <SelectItem value="NON_RESPECT_REGLES">Non-respect des règles</SelectItem>
                  <SelectItem value="AUTRE">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gravité</Label>
              <Select value={gravite} onValueChange={(value: IncidentGravite) => setGravite(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MINEUR">Mineur</SelectItem>
                  <SelectItem value="MODERE">Modéré</SelectItem>
                  <SelectItem value="MAJEUR">Majeur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="impactDiscipline">Impact sur le score discipline (points)</Label>
            <Input
              id="impactDiscipline"
              type="number"
              min="0"
              max="25"
              value={impactDiscipline}
              onChange={(e) => setImpactDiscipline(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-destructive text-destructive-foreground" disabled={isLoading}>
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
