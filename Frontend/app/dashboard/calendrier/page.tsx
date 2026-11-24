"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
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
  Pencil,
  Trash2,
  Loader2,
  ShieldAlert,
  Users,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  List,
  LayoutGrid,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CALENDAR_SOURCE_LABELS, type CalendarEntry, type CalendarSource } from "@/lib/types"
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  updateCalendarEvent,
} from "@/actions/calendar"
import { CalendarParticipantPicker } from "@/components/calendar-participant-picker"
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

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

// Clé de jour en heure locale (jamais l'UTC de toISOString, qui décalerait
// un rendez-vous du soir au lendemain).
const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

// Grille du mois : semaines complètes, du lundi au dimanche.
const monthGrid = (month: Date) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7))
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const end = new Date(last)
  end.setDate(last.getDate() + (6 - ((last.getDay() + 6) % 7)))
  const days: Date[] = []
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d))
  return { start, end, days }
}

const DOT_CLASS: Record<CalendarSource, string> = {
  TASK: "bg-primary",
  REMINDER: "bg-amber-500",
  RELANCE_CLIENT: "bg-secondary",
  EVENT: "bg-accent-500",
}

// `datetime-local` attend l'heure locale du navigateur, jamais l'UTC brut
// de `toISOString()` (décalerait l'affichage selon le fuseau).
const toDatetimeLocal = (iso: string) => {
  const date = new Date(iso)
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

const groupByDay = (entries: CalendarEntry[]) => {
  const groups = new Map<string, CalendarEntry[]>()
  for (const entry of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = dayKey(new Date(entry.date))
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(entry)
  }
  return groups
}

const dayTitle = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })

export default function CalendrierPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [view, setView] = useState<"calendar" | "list">("calendar")
  const [query, setQuery] = useState("")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const grid = useMemo(() => monthGrid(month), [month])
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startAt, setStartAt] = useState("")
  const [endAt, setEndAt] = useState("")
  const [participantUserIds, setParticipantUserIds] = useState<number[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)

  const load = async () => {
    setIsLoading(true)
    try {
      const end = new Date(grid.end)
      end.setHours(23, 59, 59, 999)
      setEntries(await getCalendarEvents(grid.start.toISOString(), end.toISOString()))
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
  }, [grid])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("nbn-calendar-view")
      if (saved === "calendar" || saved === "list") setView(saved)
    } catch {
      // Choix par défaut.
    }
  }, [])

  const changeView = (next: "calendar" | "list") => {
    setView(next)
    try {
      window.localStorage.setItem("nbn-calendar-view", next)
    } catch {
      // Le choix vaut pour cette visite seulement.
    }
  }

  const shiftMonth = (delta: number) => {
    setSelectedDay(null)
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  const goToday = () => {
    const now = new Date()
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDay(dayKey(now))
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setStartAt("")
    setEndAt("")
    setParticipantUserIds([])
    setEditingId(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setShowModal(true)
  }

  const handleOpenEdit = (entry: CalendarEntry) => {
    setEditingId(entry.id)
    setTitle(entry.title)
    setDescription(entry.description || "")
    setStartAt(toDatetimeLocal(entry.date))
    setEndAt(entry.endDate ? toDatetimeLocal(entry.endDate) : "")
    setParticipantUserIds((entry.participants || []).map((p) => p.idUser))
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !startAt) {
      toast.error("Le titre et la date de début sont obligatoires")
      return
    }
    setSubmitting(true)
    try {
      if (editingId) {
        await updateCalendarEvent(editingId, {
          title: title.trim(),
          description: description.trim() || undefined,
          startAt: new Date(startAt).toISOString(),
          endAt: endAt ? new Date(endAt).toISOString() : undefined,
          participantUserIds,
        })
        toast.success("Rendez-vous mis à jour avec succès")
      } else {
        await createCalendarEvent({
          title: title.trim(),
          description: description.trim() || undefined,
          startAt: new Date(startAt).toISOString(),
          endAt: endAt ? new Date(endAt).toISOString() : undefined,
          participantUserIds,
        })
        toast.success("Rendez-vous créé avec succès")
      }
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

  const normalized = query.trim().toLowerCase()
  const matches = normalized
    ? entries.filter((entry) =>
        [entry.title, entry.description, entry.creator, CALENDAR_SOURCE_LABELS[entry.source]]
          .filter(Boolean)
          .some((text) => String(text).toLowerCase().includes(normalized))
      )
    : entries
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`
  const inMonth = matches.filter((entry) => dayKey(new Date(entry.date)).startsWith(monthKey))
  const byDay = groupByDay(matches)
  const todayKey = dayKey(new Date())
  const monthLabel = month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
  // Sous la grille : le jour choisi, sinon tout le mois (résultats de la
  // recherche compris).
  const listed = selectedDay ? byDay.get(selectedDay) ?? [] : inMonth
  const listedGroups = groupByDay(listed)

  const renderEntry = (entry: CalendarEntry) => {
    const Icon = SOURCE_ICON[entry.source]
    return (
      <Card key={`${entry.source}-${entry.id}`} className="border-border">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {entry.source === "TASK" ? (
                  <Link href={`/dashboard/tasks/${entry.id}`} className="font-semibold break-words hover:underline">
                    {entry.title}
                  </Link>
                ) : (
                  <span className="font-semibold break-words">{entry.title}</span>
                )}
                <Badge className={SOURCE_BADGE_CLASS[entry.source]}>{CALENDAR_SOURCE_LABELS[entry.source]}</Badge>
              </div>
              {entry.description && (
                <p className="text-sm text-muted-foreground mt-1 break-words">{entry.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(entry.date).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                {entry.creator ? `, par ${entry.creator}` : ""}
              </p>
              {entry.source === "EVENT" && entry.participants && entry.participants.length > 0 && (
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  {entry.participants.map((p) => (
                    <Badge key={p.idUser} variant="outline" className="text-xs">
                      {p.fullName || `Utilisateur ${p.idUser}`}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          {entry.source === "EVENT" && (
            <div className="flex items-center gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(entry)} aria-label="Modifier le rendez-vous">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(entry)}
                aria-label="Supprimer le rendez-vous"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderGroups = (groups: Map<string, CalendarEntry[]>) => (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([key, dayEntries]) => (
        <div key={key}>
          <h3 className="text-sm font-semibold text-muted-foreground first-letter:uppercase mb-2">{dayTitle(key)}</h3>
          <div className="grid gap-3">{dayEntries.map(renderEntry)}</div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Calendrier</h1>
          <p className="text-muted-foreground mt-2">
            Tâches, rappels, relances clients et rendez-vous de l&apos;équipe, au même endroit.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nouveau rendez-vous
        </Button>
      </div>

      <Card className="border-border">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label="Mois précédent">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="min-w-40 text-center font-semibold capitalize" aria-live="polite">
              {monthLabel}
            </p>
            <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label="Mois suivant">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={goToday}>
              Aujourd&apos;hui
            </Button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedDay(null)
                }}
                placeholder="Rechercher dans ce mois"
                aria-label="Rechercher dans le calendrier"
                className="pl-9 pr-9"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div role="radiogroup" aria-label="Affichage" className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
              {[
                { value: "calendar" as const, label: "Calendrier", icon: LayoutGrid },
                { value: "list" as const, label: "Liste du mois", icon: List },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={view === option.value}
                  onClick={() => changeView(option.value)}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                    view === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <option.icon className="h-4 w-4" aria-hidden />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : view === "calendar" ? (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-semibold uppercase text-muted-foreground">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grid.days.map((date) => {
                const key = dayKey(date)
                const dayEntries = byDay.get(key) ?? []
                const outside = date.getMonth() !== month.getMonth()
                const selected = selectedDay === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(selected ? null : key)}
                    aria-pressed={selected}
                    aria-label={`${date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}, ${dayEntries.length} élément${dayEntries.length > 1 ? "s" : ""}`}
                    className={cn(
                      "flex min-h-16 flex-col gap-1 border-b border-r border-border p-1.5 text-left align-top transition-colors hover:bg-muted/50 sm:min-h-24 sm:p-2 [&:nth-child(7n)]:border-r-0",
                      outside && "bg-muted/20 text-muted-foreground",
                      selected && "bg-primary/10 ring-2 ring-inset ring-primary"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                        key === todayKey && "bg-primary text-primary-foreground"
                      )}
                    >
                      {date.getDate()}
                    </span>
                    {/* Téléphone : points de couleur ; écran large : titres */}
                    <span className="flex flex-wrap gap-1 sm:hidden">
                      {dayEntries.slice(0, 4).map((entry) => (
                        <span key={`${entry.source}-${entry.id}`} className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASS[entry.source])} />
                      ))}
                    </span>
                    <span className="hidden w-full space-y-1 sm:block">
                      {dayEntries.slice(0, 3).map((entry) => (
                        <span
                          key={`${entry.source}-${entry.id}`}
                          className="flex items-center gap-1.5 truncate rounded px-1 py-0.5 text-[11px] leading-tight hover:bg-muted"
                        >
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_CLASS[entry.source])} aria-hidden />
                          <span className="truncate">{entry.title}</span>
                        </span>
                      ))}
                      {dayEntries.length > 3 && (
                        <span className="block px-1 text-[11px] font-medium text-muted-foreground">
                          {dayEntries.length - 3} de plus
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {(Object.keys(CALENDAR_SOURCE_LABELS) as CalendarSource[]).map((source) => (
              <span key={source} className="inline-flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", DOT_CLASS[source])} aria-hidden />
                {CALENDAR_SOURCE_LABELS[source]}
              </span>
            ))}
          </div>

          <section aria-labelledby="calendar-detail-title" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="calendar-detail-title" className="text-lg font-semibold first-letter:uppercase">
                {selectedDay
                  ? dayTitle(selectedDay)
                  : normalized
                    ? `Résultats pour « ${query.trim()} » en ${monthLabel}`
                    : `Tout ${monthLabel}`}
              </h2>
              {selectedDay && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
                  Voir tout le mois
                </Button>
              )}
            </div>
            {listed.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                {normalized ? "Aucun résultat pour cette recherche." : "Rien de prévu."}
              </p>
            ) : (
              renderGroups(listedGroups)
            )}
          </section>
        </div>
      ) : inMonth.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">
            {normalized ? "Aucun résultat pour cette recherche" : `Rien de prévu en ${monthLabel}`}
          </h3>
        </div>
      ) : (
        renderGroups(groupByDay(inMonth))
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}</DialogTitle>
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
            <div className="space-y-2">
              <Label>Personnes concernées (notifiées automatiquement)</Label>
              <CalendarParticipantPicker
                selectedUserIds={participantUserIds}
                onChange={setParticipantUserIds}
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Enregistrement..." : editingId ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
