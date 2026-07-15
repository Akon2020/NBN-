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
import { rejectRequisition, requestRequisitionComplement } from "@/actions/requisitions"
import type { Requisition } from "@/lib/types"
import { toast } from "sonner"

interface DecideRequisitionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requisition: Requisition | null
  mode: "REJETER" | "COMPLEMENT"
  onUpdated: (requisition: Requisition) => void
}

export function DecideRequisitionModal({
  open,
  onOpenChange,
  requisition,
  mode,
  onUpdated,
}: DecideRequisitionModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [motif, setMotif] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requisition || !motif.trim()) return

    setIsLoading(true)
    try {
      const updated =
        mode === "REJETER"
          ? await rejectRequisition(requisition.idRequisition, motif.trim())
          : await requestRequisitionComplement(requisition.idRequisition, motif.trim())
      onUpdated(updated)
      onOpenChange(false)
      setMotif("")
      toast.success(mode === "REJETER" ? "Réquisition rejetée" : "Complément demandé")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  if (!requisition) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "REJETER" ? "Rejeter la réquisition" : "Demander un complément"}
          </DialogTitle>
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
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
