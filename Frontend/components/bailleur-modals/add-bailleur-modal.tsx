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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { createBailleur } from "@/actions/bailleurs"
import type { Bailleur, BailleurType, BailleurTypeCollaboration } from "@/lib/types"
import { toast } from "sonner"

interface AddBailleurModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (bailleur: Bailleur) => void
}

export function AddBailleurModal({ open, onOpenChange, onAdd }: AddBailleurModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    type: "" as BailleurType | "",
    typeCollaboration: "" as BailleurTypeCollaboration | "",
    margeAgence: "",
  })

  const resetForm = () =>
    setFormData({ fullName: "", phone: "", email: "", type: "", typeCollaboration: "", margeAgence: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.type || !formData.fullName) return

    setIsLoading(true)
    try {
      const created = await createBailleur({
        fullName: formData.fullName,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        type: formData.type,
        typeCollaboration: formData.typeCollaboration || undefined,
        margeAgence: formData.margeAgence ? Number.parseFloat(formData.margeAgence) : undefined,
      })
      onAdd(created)
      onOpenChange(false)
      resetForm()
      toast.success("Bailleur ajouté avec succès")
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
          <DialogTitle>Ajouter un bailleur</DialogTitle>
          <DialogDescription>Nouvelle fiche bailleur (CDC §3)</DialogDescription>
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
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                placeholder="+243 999 999 999"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: BailleurType) => setFormData({ ...formData, type: value })}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionnez" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROPRIETAIRE">Propriétaire</SelectItem>
                  <SelectItem value="MANDATAIRE">Mandataire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="typeCollaboration">Collaboration</Label>
              <Select
                value={formData.typeCollaboration}
                onValueChange={(value: BailleurTypeCollaboration) =>
                  setFormData({ ...formData, typeCollaboration: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionnez" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OCCASIONNELLE">Occasionnelle</SelectItem>
                  <SelectItem value="REGULIERE">Régulière</SelectItem>
                  <SelectItem value="EXCLUSIVE">Exclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="margeAgence">Marge agence ($)</Label>
            <Input
              id="margeAgence"
              type="number"
              min="0"
              value={formData.margeAgence}
              onChange={(e) => setFormData({ ...formData, margeAgence: e.target.value })}
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
