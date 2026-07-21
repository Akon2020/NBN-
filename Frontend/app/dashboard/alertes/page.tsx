"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, ShieldAlert, Bell, Check, Plus, UserPlus } from "lucide-react"
import {
  ALERT_SEVERITE_LABELS,
  ALERT_STATUT_LABELS,
  type Alert,
  type AlertSeverite,
  type AlertStatut,
} from "@/lib/types"
import { createAlert, getAllAlerts, assignAlert, transitionAlertStatus } from "@/actions/alerts"
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
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newType, setNewType] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newSeverite, setNewSeverite] = useState<AlertSeverite>("AVERTISSEMENT")
  const [newAssignedTo, setNewAssignedTo] = useState<string>("")

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

  const resetCreateForm = () => {
    setNewType("")
    setNewTitle("")
    setNewDescription("")
    setNewSeverite("AVERTISSEMENT")
    setNewAssignedTo("")
  }

  const handleCreate = async () => {
    if (!newType.trim() || !newTitle.trim()) {
      toast.error("Le type et le titre sont obligatoires")
      return
    }
    setSubmitting(true)
    try {
      const created = await createAlert({
        type: newType.trim(),
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        severite: newSeverite,
        assignedTo: newAssignedTo ? Number(newAssignedTo) : undefined,
      })
      setAlerts((prev) => [created, ...prev])
      toast.success("Alerte créée avec succès")
      setShowCreateModal(false)
      resetCreateForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSubmitting(false)
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Alertes</h1>
          <p className="text-muted-foreground mt-2">
            Suivi en direct — mises à jour automatiques via Socket.IO, avec repli REST
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle alerte
        </Button>
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

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle alerte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Input
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                placeholder="ex. incident:securite"
              />
            </div>
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description (optionnelle)</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Sévérité</Label>
                <Select value={newSeverite} onValueChange={(v) => setNewSeverite(v as AlertSeverite)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ALERT_SEVERITE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {directory.length > 0 && (
                <div className="space-y-2">
                  <Label>Assigner à (optionnel)</Label>
                  <Select value={newAssignedTo} onValueChange={setNewAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Personne" />
                    </SelectTrigger>
                    <SelectContent>
                      {directory.map((user) => (
                        <SelectItem key={user.idUser} value={String(user.idUser)}>
                          {user.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
