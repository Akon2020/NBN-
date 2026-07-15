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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { rejectMission, requestMissionCorrection } from "@/actions/missions"
import type { Mission } from "@/lib/types"
import { toast } from "sonner"

interface RejectMissionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mission: Mission | null
  mode: "REJETER" | "CORRECTION"
  onUpdated: (mission: Mission) => void
}

export function RejectMissionModal({ open, onOpenChange, mission, mode, onUpdated }: RejectMissionModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [motif, setMotif] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mission || !motif.trim()) return

    setIsLoading(true)
    try {
      const updated =
        mode === "REJETER"
          ? await rejectMission(mission.idMission, motif.trim())
          : await requestMissionCorrection(mission.idMission, motif.trim())
      onUpdated(updated)
      onOpenChange(false)
      setMotif("")
      toast.success(mode === "REJETER" ? "Mission rejetée" : "Correction demandée")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  if (!mission) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "REJETER" ? "Rejeter la mission" : "Demander une correction"}</DialogTitle>
          <DialogDescription>Un motif est obligatoire pour cette action.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="motif">Motif *</Label>
            <Textarea
              id="motif"
              rows={4}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Expliquez la raison..."
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-destructive text-destructive-foreground"
              disabled={isLoading || !motif.trim()}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
