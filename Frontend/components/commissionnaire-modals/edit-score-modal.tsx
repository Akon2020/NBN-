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
import { Loader2 } from "lucide-react"
import { updateCommissionnaireScore } from "@/actions/commissionnaires"
import type { Commissionnaire } from "@/lib/types"
import { toast } from "sonner"

interface EditScoreModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commissionnaire: Commissionnaire | null
  onUpdated: (commissionnaire: Commissionnaire) => void
}

const DIMENSIONS: { key: keyof typeof initialState; label: string }[] = [
  { key: "scorePerformance", label: "Performance" },
  { key: "scoreQualite", label: "Qualité" },
  { key: "scoreDiscipline", label: "Discipline" },
  { key: "scoreEngagement", label: "Engagement" },
]

const initialState = {
  scorePerformance: "",
  scoreQualite: "",
  scoreDiscipline: "",
  scoreEngagement: "",
}

export function EditScoreModal({ open, onOpenChange, commissionnaire, onUpdated }: EditScoreModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [scores, setScores] = useState(initialState)

  useEffect(() => {
    if (commissionnaire) {
      setScores({
        scorePerformance: String(commissionnaire.scorePerformance),
        scoreQualite: String(commissionnaire.scoreQualite),
        scoreDiscipline: String(commissionnaire.scoreDiscipline),
        scoreEngagement: String(commissionnaire.scoreEngagement),
      })
    }
  }, [commissionnaire])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commissionnaire) return

    setIsLoading(true)
    try {
      const updated = await updateCommissionnaireScore(commissionnaire.idCommissionnaire, {
        scorePerformance: Number.parseFloat(scores.scorePerformance),
        scoreQualite: Number.parseFloat(scores.scoreQualite),
        scoreDiscipline: Number.parseFloat(scores.scoreDiscipline),
        scoreEngagement: Number.parseFloat(scores.scoreEngagement),
      })
      onUpdated(updated)
      onOpenChange(false)
      toast.success("Score évalué avec succès")
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
          <DialogTitle>Évaluer le score</DialogTitle>
          <DialogDescription>
            4 dimensions sur 25 points chacune (CDC §7) — la grille d'évolution (niveau, statut) est
            réappliquée automatiquement.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {DIMENSIONS.map((dimension) => (
            <div key={dimension.key} className="space-y-2">
              <Label htmlFor={dimension.key}>{dimension.label} (/25)</Label>
              <Input
                id={dimension.key}
                type="number"
                min="0"
                max="25"
                step="0.5"
                value={scores[dimension.key]}
                onChange={(e) => setScores({ ...scores, [dimension.key]: e.target.value })}
                required
              />
            </div>
          ))}

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
