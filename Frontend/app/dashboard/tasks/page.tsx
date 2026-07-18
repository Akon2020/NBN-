"use client"

import { useEffect, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import Link from "next/link"
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
import { Plus, Loader2, ShieldAlert, GripVertical, CalendarClock, ListChecks } from "lucide-react"
import {
  TASK_PRIORITE_LABELS,
  TASK_STATUT_LABELS,
  TASK_STATUT_STAGES,
  type Task,
  type TaskPriorite,
  type TaskStatut,
} from "@/lib/types"
import { createTask, getAllTasks, updateTaskStatus, type TaskInput } from "@/actions/tasks"
import { CalendarParticipantPicker } from "@/components/calendar-participant-picker"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const PRIORITE_BADGE_CLASS: Record<TaskPriorite, string> = {
  BASSE: "bg-muted text-muted-foreground",
  NORMALE: "bg-primary text-primary-foreground",
  HAUTE: "bg-amber-500 text-white",
  URGENTE: "bg-destructive text-destructive-foreground",
}

// GOAL 15 — Kanban générique des tâches, même patron que le pipeline
// commercial (GOAL 7) : glisser une carte appelle directement
// PATCH /api/tasks/:id/statut, aucune règle de transition côté Frontend
// (CLAUDE.md §4 — le statut d'une tâche ne pilote jamais une ressource liée).

function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.idTask,
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <Card ref={setNodeRef} style={style} className={cn("border-border touch-none", isDragging && "opacity-40")}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-1">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            aria-label="Déplacer"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Link href={`/dashboard/tasks/${task.idTask}`} className="min-w-0 flex-1">
            <p className="font-medium text-sm line-clamp-2 hover:underline">{task.title}</p>
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-wrap pl-5">
          <Badge className={cn("text-xs", PRIORITE_BADGE_CLASS[task.priorite])}>
            {TASK_PRIORITE_LABELS[task.priorite]}
          </Badge>
          {task.dateEcheance && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="h-3 w-3" />
              {new Date(task.dateEcheance).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>
        {task.assignees.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap pl-5">
            {task.assignees.map((a) => (
              <Badge key={a.idUser} variant="outline" className="text-xs">
                {a.user?.fullName || `Utilisateur #${a.idUser}`}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TaskColumn({ stage, tasks }: { stage: TaskStatut; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-sm">{TASK_STATUT_LABELS[stage]}</h3>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-3 min-h-[120px] rounded-lg p-1 transition-colors",
          isOver && "bg-primary/5 ring-2 ring-primary/30"
        )}
      >
        {tasks.map((task) => (
          <TaskCard key={task.idTask} task={task} />
        ))}
      </div>
    </div>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priorite, setPriorite] = useState<TaskPriorite>("NORMALE")
  const [dateEcheance, setDateEcheance] = useState("")
  const [assigneeUserIds, setAssigneeUserIds] = useState<number[]>([])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    const load = async () => {
      try {
        setTasks(await getAllTasks())
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
    load()
  }, [])

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setPriorite("NORMALE")
    setDateEcheance("")
    setAssigneeUserIds([])
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Le titre est obligatoire")
      return
    }
    setSubmitting(true)
    try {
      const input: TaskInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        priorite,
        dateEcheance: dateEcheance || undefined,
        assigneeUserIds,
      }
      const created = await createTask(input)
      setTasks((prev) => [created, ...prev])
      toast.success("Tâche créée avec succès")
      setShowModal(false)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.idTask === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const task = tasks.find((t) => t.idTask === active.id)
    const nextStatut = over.id as TaskStatut
    if (!task || task.statut === nextStatut) return

    const previousTasks = tasks
    setTasks(tasks.map((t) => (t.idTask === task.idTask ? { ...t, statut: nextStatut } : t)))

    try {
      const updated = await updateTaskStatus(task.idTask, nextStatut)
      setTasks((prev) => prev.map((t) => (t.idTask === task.idTask ? updated : t)))
      toast.success(`Déplacé vers « ${TASK_STATUT_LABELS[nextStatut]} »`)
    } catch (error) {
      setTasks(previousTasks)
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Accès non autorisé</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre rôle ne dispose pas de la permission pour consulter les tâches.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Tâches</h1>
          <p className="text-muted-foreground mt-2">
            Glissez une carte vers une autre colonne pour changer son statut
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle tâche
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ListChecks className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucune tâche</h3>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-flow-col auto-cols-[280px] gap-4 overflow-x-auto pb-4">
            {TASK_STATUT_STAGES.map((stage) => (
              <TaskColumn key={stage} stage={stage} tasks={tasks.filter((t) => t.statut === stage)} />
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <Card className="border-primary shadow-lg w-[260px]">
                <CardContent className="p-3">
                  <p className="font-medium text-sm line-clamp-2">{activeTask.title}</p>
                </CardContent>
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Relancer le bailleur" />
            </div>
            <div className="space-y-2">
              <Label>Description (optionnelle)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select value={priorite} onValueChange={(v) => setPriorite(v as TaskPriorite)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_PRIORITE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Échéance (optionnelle)</Label>
                <Input type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assignés (notifiés automatiquement)</Label>
              <CalendarParticipantPicker selectedUserIds={assigneeUserIds} onChange={setAssigneeUserIds} />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
