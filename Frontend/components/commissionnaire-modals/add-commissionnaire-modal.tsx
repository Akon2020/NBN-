"use client"

import type React from "react"

import { useState } from "react"
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
import { createCommissionnaire } from "@/actions/commissionnaires"
import type { Commissionnaire } from "@/lib/types"
import { toast } from "sonner"

interface AddCommissionnaireModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (commissionnaire: Commissionnaire) => void
}

export function AddCommissionnaireModal({ open, onOpenChange, onAdd }: AddCommissionnaireModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ fullName: "", phone: "", code: "", zone: "" })

  const resetForm = () => setFormData({ fullName: "", phone: "", code: "", zone: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fullName || !formData.code) return

    setIsLoading(true)
    try {
      const created = await createCommissionnaire({
        fullName: formData.fullName,
        phone: formData.phone || undefined,
        code: formData.code,
        zone: formData.zone || undefined,
      })
      onAdd(created)
      onOpenChange(false)
      resetForm()
      toast.success("Commissionnaire ajouté avec succès")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un commissionnaire</DialogTitle>
          <DialogDescription>Nouvelle fiche digitale terrain (CDC §7)</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nom complet *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                placeholder="CMR-001"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone">Zone</Label>
              <Input
                id="zone"
                placeholder="Ibanda"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              placeholder="+243 999 999 999"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground" disabled={isLoading}>
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
