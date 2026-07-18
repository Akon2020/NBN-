"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  ArrowLeft,
  CalendarClock,
  Loader2,
  Pencil,
  Send,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react"
import {
  TASK_PRIORITE_LABELS,
  TASK_STATUT_LABELS,
  type Task,
  type TaskComment,
  type TaskPriorite,
  type TaskStatut,
} from "@/lib/types"
import {
  addTaskComment,
  deleteTaskComment,
  getSingleTask,
  getTaskComments,
  updateTask,
  updateTaskStatus,
  type TaskInput,
} from "@/actions/tasks"
import { CalendarParticipantPicker } from "@/components/calendar-participant-picker"
import { EntityTimeline } from "@/components/entity-timeline"
import { getAuthUser } from "@/lib/auth"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const PRIORITE_BADGE_CLASS: Record<TaskPriorite, string> = {
  BASSE: "bg-muted text-muted-foreground",
  NORMALE: "bg-primary text-primary-foreground",
  HAUTE: "bg-amber-500 text-white",
  URGENTE: "bg-destructive text-destructive-foreground",
}

const STATUT_BADGE_CLASS: Record<TaskStatut, string> = {
  A_FAIRE: "bg-muted text-muted-foreground",
  EN_COURS: "bg-primary text-primary-foreground",
  EN_REVISION: "bg-amber-500 text-white",
  TERMINEE: "bg-secondary text-secondary-foreground",
}

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const taskId = Number(params.id)
  const currentUserId = getAuthUser()?.idUser

  const [task, setTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<TaskComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [postingComment, setPostingComment] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priorite, setPriorite] = useState<TaskPriorite>("NORMALE")
  const [dateEcheance, setDateEcheance] = useState("")
  const [assigneeUserIds, setAssigneeUserIds] = useState<number[]>([])

  const load = async () => {
    try {
      const [taskData, commentsData] = await Promise.all([
        getSingleTask(taskId),
        getTaskComments(taskId),
      ])
      setTask(taskData)
      setComments(commentsData)
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("trouvée")) {
        setNotFound(true)
      } else {
        toast.error(error instanceof Error ? error.message : "Erreur inconnue")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!Number.isNaN(taskId)) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  const openEdit = () => {
    if (!task) return
    setTitle(task.title)
    setDescription(task.description || "")
    setPriorite(task.priorite)
    setDateEcheance(task.dateEcheance ? task.dateEcheance.slice(0, 10) : "")
    setAssigneeUserIds(task.assignees.map((a) => a.idUser))
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!task || !title.trim()) {
      toast.error("Le titre est obligatoire")
      return
    }
    setSubmitting(true)
    try {
      const input: Partial<TaskInput> = {
        title: title.trim(),
        description: description.trim() || undefined,
        priorite,
        dateEcheance: dateEcheance || null,
        assigneeUserIds,
      }
      const updated = await updateTask(task.idTask, input)
      setTask(updated)
      toast.success("Tâche mise à jour")
      setShowEditModal(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatutChange = async (statut: TaskStatut) => {
    if (!task) return
    try {
      const updated = await updateTaskStatus(task.idTask, statut)
      setTask(updated)
      toast.success(`Statut : ${TASK_STATUT_LABELS[statut]}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  const handlePostComment = async () => {
    if (!task || !newComment.trim()) return
    setPostingComment(true)
    try {
      const comment = await addTaskComment(task.idTask, newComment.trim())
      setComments((prev) => [...prev, comment])
      setNewComment("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setPostingComment(false)
    }
  }

  const handleDeleteComment = async (comment: TaskComment) => {
    if (!task) return
    try {
      await deleteTaskComment(task.idTask, comment.idTaskComment)
      setComments((prev) => prev.filter((c) => c.idTaskComment !== comment.idTaskComment))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Tâche introuvable</h3>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/tasks")}>
          Retour aux tâches
        </Button>
      </div>
    )
  }

  if (isLoading || !task) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/tasks" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Retour aux tâches
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-balance break-words">{task.title}</h1>
            <Badge className={STATUT_BADGE_CLASS[task.statut]}>{TASK_STATUT_LABELS[task.statut]}</Badge>
            <Badge className={PRIORITE_BADGE_CLASS[task.priorite]}>{TASK_PRIORITE_LABELS[task.priorite]}</Badge>
          </div>
          {task.description && <p className="text-muted-foreground mt-2 break-words">{task.description}</p>}
        </div>
        <Button variant="outline" onClick={openEdit} className="shrink-0">
          <Pencil className="h-4 w-4 mr-1" />
          Modifier
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Statut</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(Object.keys(TASK_STATUT_LABELS) as TaskStatut[]).map((statut) => (
                <Button
                  key={statut}
                  size="sm"
                  variant={statut === task.statut ? "default" : "outline"}
                  onClick={() => handleStatutChange(statut)}
                  disabled={statut === task.statut}
                >
                  {TASK_STATUT_LABELS[statut]}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Commentaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun commentaire pour l&apos;instant.</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.idTaskComment} className="flex items-start justify-between gap-2 rounded-md border border-border p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{comment.author?.fullName || `Utilisateur #${comment.authorId}`}</p>
                        <p className="text-sm text-muted-foreground mt-0.5 break-words">{comment.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(comment.createdAt).toLocaleString("fr-FR")}
                        </p>
                      </div>
                      {comment.authorId === currentUserId && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="shrink-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteComment(comment)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-start gap-2 pt-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajouter un commentaire..."
                  className="min-h-[60px]"
                />
                <Button onClick={handlePostComment} disabled={postingComment || !newComment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <EntityTimeline entityType="TASK" entityId={task.idTask} />
        </div>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Assignés
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {task.assignees.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun assigné</p>
              ) : (
                task.assignees.map((a) => (
                  <Badge key={a.idUser} variant="outline" className="mr-1">
                    {a.user?.fullName || `Utilisateur #${a.idUser}`}
                  </Badge>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                Échéance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {task.dateEcheance ? new Date(task.dateEcheance).toLocaleDateString("fr-FR") : "Aucune échéance"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Créée par {task.creator?.fullName || `#${task.createdBy}`} le{" "}
                {new Date(task.createdAt).toLocaleDateString("fr-FR")}
              </p>
            </CardContent>
          </Card>

          {(task.propertyLinks.length > 0 ||
            task.clientLinks.length > 0 ||
            task.bailleurLinks.length > 0 ||
            task.commissionnaireLinks.length > 0) && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Ressources liées</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {task.propertyLinks.map((link) => (
                  <Link
                    key={`property-${link.idProperty}`}
                    href={`/dashboard/rentals/${link.idProperty}`}
                    className={cn("block text-sm hover:underline")}
                  >
                    Bien — {link.property?.quartier || `#${link.idProperty}`}
                  </Link>
                ))}
                {task.clientLinks.map((link) => (
                  <Link
                    key={`client-${link.idClient}`}
                    href={`/dashboard/clients/${link.idClient}`}
                    className="block text-sm hover:underline"
                  >
                    Client #{link.idClient}
                  </Link>
                ))}
                {task.bailleurLinks.map((link) => (
                  <span key={`bailleur-${link.idBailleur}`} className="block text-sm">
                    Bailleur #{link.idBailleur}
                  </span>
                ))}
                {task.commissionnaireLinks.map((link) => (
                  <Link
                    key={`commissionnaire-${link.idCommissionnaire}`}
                    href={`/dashboard/commissionnaires/${link.idCommissionnaire}`}
                    className="block text-sm hover:underline"
                  >
                    {link.commissionnaire?.person?.fullName || `Commissionnaire #${link.idCommissionnaire}`}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la tâche</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
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
                <Label>Échéance</Label>
                <Input type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assignés (notifiés automatiquement)</Label>
              <CalendarParticipantPicker selectedUserIds={assigneeUserIds} onChange={setAssigneeUserIds} />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
