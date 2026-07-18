"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, ShieldAlert, Bell, Check, UserPlus } from "lucide-react"
import {
  ALERT_SEVERITE_LABELS,
  ALERT_STATUT_LABELS,
  type Alert,
  type AlertSeverite,
  type AlertStatut,
} from "@/lib/types"
import { getAllAlerts, assignAlert, transitionAlertStatus } from "@/actions/alerts"
import { getUsersDirectory, type UserDirectoryEntry } from "@/actions/users"
import { getSocket } from "@/lib/socket"
import { toast } from "sonner"

const SEVERITE_BADGE_CLASS: Record<AlertSeverite, string> = {
  INFO: "bg-muted text-muted-foreground",
  AVERTISSEMENT: "bg-amber-500 text-white",
  CRITIQUE: "bg-destructive text-destructive-foreground",
}

const NEXT_STATUT: Partial<Record<AlertStatut, AlertStatut>> = {
  OUVERTE: "RECONNUE",
  RECONNUE: "EN_COURS",
  ASSIGNEE: "EN_COURS",
  EN_COURS: "RESOLUE",
  RESOLUE: "CLOTUREE",
}

export default function AlertesPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [directory, setDirectory] = useState<UserDirectoryEntry[]>([])

  const load = async () => {
    try {
      setAlerts(await getAllAlerts())
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("permission")) {
        setForbidden(true)
      } else {
        toast.error(error instanceof Error ? error.message : "Erreur inconnue")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    getUsersDirectory()
      .then(setDirectory)
      .catch(() => {
        // Sélecteur d'assignation simplement absent si l'annuaire échoue.
      })

    // ADMIN-G07 — déclencheur d'invalidation uniquement (CLAUDE.md §6) :
    // Socket.IO ne pousse jamais l'alerte elle-même, juste "quelque chose a
    // changé, refetch".
    const socket = getSocket()
    const refetch = () => load()
    socket.on("alert:new", refetch)
    socket.on("alert:updated", refetch)
    return () => {
      socket.off("alert:new", refetch)
      socket.off("alert:updated", refetch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdvance = async (alert: Alert) => {
    const next = NEXT_STATUT[alert.statut]
    if (!next) return
    try {
      const updated = await transitionAlertStatus(alert.idAlert, next)
      setAlerts((prev) => prev.map((a) => (a.idAlert === updated.idAlert ? updated : a)))
      toast.success(`Alerte passée à « ${ALERT_STATUT_LABELS[next]} »`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  const handleAssign = async (alert: Alert, idUser: string) => {
    try {
      const updated = await assignAlert(alert.idAlert, Number(idUser))
      setAlerts((prev) => prev.map((a) => (a.idAlert === updated.idAlert ? updated : a)))
      toast.success("Alerte assignée")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Accès non autorisé</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre rôle ne dispose pas de la permission pour consulter les alertes.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Alertes</h1>
        <p className="text-muted-foreground mt-2">
          Suivi en direct — mises à jour automatiques via Socket.IO, avec repli REST
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucune alerte</h3>
        </div>
      ) : (
        <div className="grid gap-4">
          {alerts.map((alert) => (
            <Card key={alert.idAlert} className="border-border">
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{alert.title}</span>
                    <Badge className={SEVERITE_BADGE_CLASS[alert.severite]}>
                      {ALERT_SEVERITE_LABELS[alert.severite]}
                    </Badge>
                    <Badge variant="outline">{ALERT_STATUT_LABELS[alert.statut]}</Badge>
                  </div>
                  {alert.description && (
                    <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(alert.createdAt).toLocaleString("fr-FR")}
                    {alert.assignee ? ` · Assignée à ${alert.assignee.fullName}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {alert.statut !== "CLOTUREE" && directory.length > 0 && (
                    <Select
                      value={alert.assignee ? String(alert.assignee.idUser) : ""}
                      onValueChange={(value) => handleAssign(alert, value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <UserPlus className="h-3.5 w-3.5 mr-1 shrink-0" />
                        <SelectValue placeholder="Assigner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {directory.map((user) => (
                          <SelectItem key={user.idUser} value={String(user.idUser)}>
                            {user.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {NEXT_STATUT[alert.statut] && (
                    <Button size="sm" variant="outline" onClick={() => handleAdvance(alert)}>
                      <Check className="h-4 w-4 mr-1" />
                      {ALERT_STATUT_LABELS[NEXT_STATUT[alert.statut]!]}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
