"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/types"
import { updateUser } from "@/actions/users"
import { User } from "@/types/type"
import { toast } from "sonner"

interface EditUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onEdit: (user: User) => void
}

export function EditUserModal({ open, onOpenChange, user, onEdit }: EditUserModalProps) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<string>("operations")
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      setFullName(user.fullName)
      setEmail(user.email)
      setRole(user.role)
      setStatus(user.status)
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    try {
      const updated = await updateUser(user.idUser, { fullName, email, role, status })
      onEdit(updated)
      onOpenChange(false)
      toast.success("Utilisateur mis à jour")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
          <DialogDescription>Mettez à jour les informations de l&apos;utilisateur</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nom complet *</Label>
            <Input
              id="edit-name"
              placeholder="Jean Mukendi"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email *</Label>
            <Input
              id="edit-email"
              type="email"
              placeholder="jean.mukendi@nyumbani.cd"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Rôle *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-status">Statut du compte</Label>
              <p className="text-sm text-muted-foreground">
                {status === "ACTIVE"
                  ? "L'utilisateur peut se connecter"
                  : "L'accès est bloqué, toutes ses sessions seront révoquées"}
              </p>
            </div>
            <Switch
              id="edit-status"
              checked={status === "ACTIVE"}
              onCheckedChange={(checked) => setStatus(checked ? "ACTIVE" : "INACTIVE")}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
