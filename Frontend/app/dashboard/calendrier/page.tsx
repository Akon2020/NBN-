"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CalendarDays,
  CheckSquare,
  Bell as BellIcon,
  UserRound,
  Plus,
  Trash2,
  Loader2,
  ShieldAlert,
} from "lucide-react"
import { CALENDAR_SOURCE_LABELS, type CalendarEntry, type CalendarSource } from "@/lib/types"
import { createCalendarEvent, deleteCalendarEvent, getCalendarEvents } from "@/actions/calendar"
import { toast } from "sonner"

const SOURCE_ICON: Record<CalendarSource, typeof CheckSquare> = {
  TASK: CheckSquare,
  REMINDER: BellIcon,
  RELANCE_CLIENT: UserRound,
  EVENT: CalendarDays,
}

const SOURCE_BADGE_CLASS: Record<CalendarSource, string> = {
  TASK: "bg-primary text-primary-foreground",
  REMINDER: "bg-amber-500 text-white",
  RELANCE_CLIENT: "bg-secondary text-secondary-foreground",
  EVENT: "bg-accent text-accent-foreground",
}

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10)

const groupByDay = (entries: CalendarEntry[]) => {
  const groups = new Map<string, CalendarEntry[]>()
  for (const entry of entries) {
    const key = new Date(entry.date).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(entry)
  }
  return groups
}

export default function CalendrierPage() {
  const today = new Date()
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  const [from, setFrom] = useState(toIsoDate(today))
  const [to, setTo] = useState(toIsoDate(in30Days))
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startAt, setStartAt] = useState("")
  const [endAt, setEndAt] = useState("")

  const load = async () => {
    setIsLoading(true)
    try {
      setEntries(await getCalendarEvents(from, to))
      setForbidden(false)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to])

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setStartAt("")
    setEndAt("")
  }

  const handleCreate = async () => {
    if (!title.trim() || !startAt) {
      toast.error("Le titre et la date de début sont obligatoires")
      return
    }
    setSubmitting(true)
    try {
      await createCalendarEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
      })
      toast.success("Rendez-vous créé avec succès")
      setShowModal(false)
      resetForm()
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (entry: CalendarEntry) => {
    try {
      await deleteCalendarEvent(entry.id)
      toast.success("Rendez-vous supprimé")
      setEntries((prev) => prev.filter((e) => !(e.source === "EVENT" && e.id === entry.id)))
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
          Votre rôle ne dispose pas de la permission pour consulter le calendrier.
        </p>
      </div>
    )
  }

  const groups = groupByDay(entries)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Calendrier</h1>
          <p className="text-muted-foreground mt-2">
            Vue agrégée des tâches, rappels, relances clients et rendez-vous — chaque source reste
            l&apos;autorité de son propre statut.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nouveau rendez-vous
        </Button>
      </div>

      <Card className="border-border">
        <CardContent className="p-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2 flex-1">
            <Label>Du</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2 flex-1">
            <Label>Au</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucun événement sur cette période</h3>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([day, dayEntries]) => (
            <div key={day}>
              <h2 className="text-sm font-semibold text-muted-foreground capitalize mb-2">
                {day}
              </h2>
              <div className="grid gap-3">
                {dayEntries.map((entry) => {
                  const Icon = SOURCE_ICON[entry.source]
                  return (
                    <Card key={`${entry.source}-${entry.id}`} className="border-border">
                      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold break-words">{entry.title}</span>
                              <Badge className={SOURCE_BADGE_CLASS[entry.source]}>
                                {CALENDAR_SOURCE_LABELS[entry.source]}
                              </Badge>
                            </div>
                            {entry.description && (
                              <p className="text-sm text-muted-foreground mt-1 break-words">
                                {entry.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(entry.date).toLocaleString("fr-FR")}
                              {entry.creator ? ` · ${entry.creator}` : ""}
                            </p>
                          </div>
                        </div>
                        {entry.source === "EVENT" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="shrink-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(entry)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau rendez-vous</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Visite du bien avec M. Dupont" />
            </div>
            <div className="space-y-2">
              <Label>Description (optionnelle)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Début</Label>
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fin (optionnelle)</Label>
                <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
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
