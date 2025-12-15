"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "agent" | "consultant"
  status: "active" | "inactive"
  createdAt: Date
}

interface EditUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onEdit: (user: User) => void
}

export function EditUserModal({ open, onOpenChange, user, onEdit }: EditUserModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "agent" | "consultant">("agent")
  const [status, setStatus] = useState<"active" | "inactive">("active")

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setRole(user.role)
      setStatus(user.status)
    }
  }, [user])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (user) {
      const updatedUser: User = {
        ...user,
        name,
        email,
        role,
        status,
      }

      onEdit(updatedUser)
      onOpenChange(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier l'utilisateur</DialogTitle>
          <DialogDescription>Mettez à jour les informations de l'utilisateur</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nom complet *</Label>
            <Input
              id="edit-name"
              placeholder="Jean Mukendi"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent terrain</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-status">Statut du compte</Label>
              <p className="text-sm text-muted-foreground">
                {status === "active" ? "L'utilisateur peut se connecter" : "L'accès est bloqué"}
              </p>
            </div>
            <Switch
              id="edit-status"
              checked={status === "active"}
              onCheckedChange={(checked) => setStatus(checked ? "active" : "inactive")}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground">
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
