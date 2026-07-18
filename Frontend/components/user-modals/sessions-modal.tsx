"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Monitor, ShieldOff } from "lucide-react"
import { getUserSessions, revokeUserSessions } from "@/actions/users"
import type { UserSession } from "@/lib/types"
import { User } from "@/types/type"
import { toast } from "sonner"

interface SessionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
}

// GOAL 16 — visibilité admin sur les sessions actives d'un utilisateur
// (CLAUDE.md §5) : jusqu'ici l'entité Session n'avait aucune surface
// d'administration, seule l'auto-déconnexion multi-appareils existait.
export function SessionsModal({ open, onOpenChange, user }: SessionsModalProps) {
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    setIsLoading(true)
    getUserSessions(user.idUser)
      .then(setSessions)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Erreur inconnue"))
      .finally(() => setIsLoading(false))
  }, [open, user])

  const handleRevokeAll = async () => {
    if (!user) return
    setRevoking(true)
    try {
      await revokeUserSessions(user.idUser)
      setSessions([])
      toast.success(`Toutes les sessions de ${user.fullName} ont été révoquées`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setRevoking(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Sessions actives</DialogTitle>
          <DialogDescription>
            Appareils actuellement connectés pour <strong>{user.fullName}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Aucune session active.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.idSession}
                className="flex items-center gap-3 rounded-md border border-border p-3"
              >
                <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium break-words">
                      {session.deviceLabel || "Appareil inconnu"}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {session.platform}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Actif le {new Date(session.lastActiveAt).toLocaleString("fr-FR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevokeAll}
            disabled={revoking || sessions.length === 0}
          >
            <ShieldOff className="h-4 w-4 mr-2" />
            {revoking ? "Révocation..." : "Déconnecter toutes les sessions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
