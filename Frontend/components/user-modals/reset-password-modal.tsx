"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resetUserPassword } from "@/actions/users"
import { User } from "@/types/type"
import { toast } from "sonner"

interface ResetPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
}

// GOAL 16 — réinitialisation admin (users:manage), sans connaître l'ancien
// mot de passe — révoque immédiatement toutes les sessions actives de la
// cible (Backend/controllers/user.controller.js::resetUserPassword).
export function ResetPasswordModal({ open, onOpenChange, user }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    try {
      await resetUserPassword(user.idUser, newPassword)
      toast.success(`Mot de passe de ${user.fullName} réinitialisé — sessions déconnectées`)
      onOpenChange(false)
      setNewPassword("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
          <DialogDescription>
            Définir un nouveau mot de passe pour <strong>{user.fullName}</strong>. Toutes ses sessions actives
            seront immédiatement déconnectées.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe *</Label>
            <Input
              id="new-password"
              type="text"
              placeholder="Au moins 6 caractères, 1 lettre, 1 chiffre, 1 symbole"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Réinitialisation..." : "Réinitialiser"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
