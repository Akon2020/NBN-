"use client"

import { useEffect, useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"
import { getUsersDirectory, type UserDirectoryEntry } from "@/actions/users"
import { toast } from "sonner"

interface CalendarParticipantPickerProps {
  selectedUserIds: number[]
  onChange: (userIds: number[]) => void
}

// GOAL 11 — sélection des personnes concernées par un rendez-vous, chacune
// notifiée automatiquement côté Backend à la création/modification.
export function CalendarParticipantPicker({
  selectedUserIds,
  onChange,
}: CalendarParticipantPickerProps) {
  const [users, setUsers] = useState<UserDirectoryEntry[] | null>(null)

  useEffect(() => {
    getUsersDirectory()
      .then(setUsers)
      .catch(() => toast.error("Erreur lors du chargement des utilisateurs"))
  }, [])

  const toggle = (idUser: number, checked: boolean) => {
    onChange(checked ? [...selectedUserIds, idUser] : selectedUserIds.filter((id) => id !== idUser))
  }

  if (users === null) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <ScrollArea className="h-40 rounded-md border border-border p-2">
      <div className="space-y-1">
        {users.map((user) => (
          <label
            key={user.idUser}
            htmlFor={`participant-${user.idUser}`}
            className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted cursor-pointer"
          >
            <Checkbox
              id={`participant-${user.idUser}`}
              checked={selectedUserIds.includes(user.idUser)}
              onCheckedChange={(checked) => toggle(user.idUser, checked === true)}
            />
            <Label htmlFor={`participant-${user.idUser}`} className="cursor-pointer font-normal">
              {user.fullName}
              <span className="text-xs text-muted-foreground ml-1">({user.role})</span>
            </Label>
          </label>
        ))}
      </div>
    </ScrollArea>
  )
}
