"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  History,
  Image as ImageIcon,
  ImageOff,
  Link2,
  Loader2,
  LogIn,
  LogOut,
  MessageSquare,
  MessageSquareWarning,
  Percent,
  Plus,
  RefreshCw,
  TrendingUp,
  UserPlus,
  X,
} from "lucide-react"
import { getEntityTimeline } from "@/actions/timeline"
import type { TimelineEntityType, TimelineEvent } from "@/lib/types"
import { toast } from "sonner"

const EVENT_ICON: Record<string, typeof History> = {
  CREATED: Plus,
  STATUS_CHANGED: RefreshCw,
  STATUT_CHANGED: RefreshCw,
  STATUT_PIPELINE_CHANGED: RefreshCw,
  STATUT_RELATION_CHANGED: RefreshCw,
  MISSION: ClipboardCheck,
  PAYMENT: Banknote,
  INCIDENT: AlertTriangle,
  ENTREE: LogIn,
  SORTIE: LogOut,
  PLAINTE: MessageSquareWarning,
  PLAINTE_RESOLUE: CheckCircle2,
  MEDIA_ADDED: ImageIcon,
  MEDIA_REMOVED: ImageOff,
  COMMISSIONNAIRE_ATTRIBUE: Link2,
  CLIENT_APPORTE: UserPlus,
  MARGIN_OVERRIDE_CHANGED: Percent,
  VALIDEE: CheckCircle2,
  REJETEE: X,
  CORRECTION_DEMANDEE: Edit3,
  PROGRESSION: TrendingUp,
  UPDATED: Edit3,
  COMMENT: MessageSquare,
}

const EVENT_COLOR: Record<string, string> = {
  CREATED: "bg-secondary-600 text-white",
  STATUS_CHANGED: "bg-primary-900 text-white",
  STATUT_CHANGED: "bg-primary-900 text-white",
  STATUT_PIPELINE_CHANGED: "bg-primary-900 text-white",
  STATUT_RELATION_CHANGED: "bg-primary-900 text-white",
  MISSION: "bg-accent-600 text-white",
  PAYMENT: "bg-success-500 text-white",
  INCIDENT: "bg-warning-500 text-neutral-900",
  ENTREE: "bg-success-500 text-white",
  SORTIE: "bg-neutral-600 text-white",
  PLAINTE: "bg-error-500 text-white",
  PLAINTE_RESOLUE: "bg-success-500 text-white",
  MEDIA_ADDED: "bg-secondary-600 text-white",
  MEDIA_REMOVED: "bg-neutral-600 text-white",
  COMMISSIONNAIRE_ATTRIBUE: "bg-primary-900 text-white",
  CLIENT_APPORTE: "bg-primary-900 text-white",
  MARGIN_OVERRIDE_CHANGED: "bg-accent-600 text-white",
  VALIDEE: "bg-success-500 text-white",
  REJETEE: "bg-error-500 text-white",
  CORRECTION_DEMANDEE: "bg-warning-500 text-neutral-900",
  PROGRESSION: "bg-primary-900 text-white",
  UPDATED: "bg-primary-900 text-white",
  COMMENT: "bg-secondary-600 text-white",
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  CREATED: "Création",
  STATUS_CHANGED: "Statut",
  STATUT_CHANGED: "Statut",
  STATUT_PIPELINE_CHANGED: "Pipeline",
  STATUT_RELATION_CHANGED: "Relation",
  MISSION: "Mission",
  PAYMENT: "Paiement",
  INCIDENT: "Incident",
  ENTREE: "Entrée",
  SORTIE: "Sortie",
  PLAINTE: "Plainte",
  PLAINTE_RESOLUE: "Plainte résolue",
  MEDIA_ADDED: "Média ajouté",
  MEDIA_REMOVED: "Média retiré",
  COMMISSIONNAIRE_ATTRIBUE: "Commissionnaire attribué",
  CLIENT_APPORTE: "Client apporté",
  MARGIN_OVERRIDE_CHANGED: "Override de marge",
  VALIDEE: "Validée",
  REJETEE: "Rejetée",
  CORRECTION_DEMANDEE: "Correction demandée",
  PROGRESSION: "Avancement",
  UPDATED: "Mise à jour",
  COMMENT: "Commentaire",
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

interface EntityTimelineProps {
  entityType: TimelineEntityType
  entityId: number
}

// GOAL 3 — historique chronologique réutilisé sur les fiches bien, client,
// commissionnaire et bailleur. Filtrable par type d'événement, jamais un
// simple flux brut non trié (le Backend trie déjà par occurredAt DESC).
export function EntityTimeline({ entityType, entityId }: EntityTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>("ALL")

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        setEvents(await getEntityTimeline(entityType, entityId))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur inconnue")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [entityType, entityId])

  const availableEventTypes = useMemo(
    () => Array.from(new Set(events.map((e) => e.eventType))),
    [events]
  )
  const filteredEvents = filter === "ALL" ? events : events.filter((e) => e.eventType === filter)

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historique
        </CardTitle>
        {availableEventTypes.length > 1 && (
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les événements</SelectItem>
              {availableEventTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {EVENT_TYPE_LABELS[type] || type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Aucun événement pour l&apos;instant.</p>
        ) : (
          <div className="space-y-0">
            {filteredEvents.map((event, index) => {
              const Icon = EVENT_ICON[event.eventType] || History
              const isLast = index === filteredEvents.length - 1
              return (
                <div key={event.idTimelineEvent} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${EVENT_COLOR[event.eventType] || "bg-muted text-muted-foreground"}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-border my-1" />}
                  </div>
                  <div className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-5"}`}>
                    <p className="text-sm font-medium break-words">{event.title}</p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 break-words">
                        {event.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(event.occurredAt)}
                      {event.actor ? ` — ${event.actor.fullName}` : ""}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
