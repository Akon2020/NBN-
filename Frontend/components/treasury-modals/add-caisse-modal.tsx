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
import { Loader2 } from "lucide-react"
import { createCaisse } from "@/actions/treasury"
import type { Caisse } from "@/lib/types"
import { toast } from "sonner"

interface AddCaisseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (caisse: Caisse) => void
}

export function AddCaisseModal({ open, onOpenChange, onAdd }: AddCaisseModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [label, setLabel] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const caisse = await createCaisse({ label })
      onAdd(caisse)
      onOpenChange(false)
      setLabel("")
      toast.success("Caisse créée avec succès")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer une caisse</DialogTitle>
          <DialogDescription>
            Un solde à zéro est initialisé automatiquement pour chaque devise active (USD/CDF).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="label">Libellé *</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Caisse principale Bukavu"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !label.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
