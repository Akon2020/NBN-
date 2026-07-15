"use client"

import { useEffect, useState, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Phone,
  Calendar,
  Trash2,
  Loader2,
  Star,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { EditScoreModal } from "@/components/commissionnaire-modals/edit-score-modal"
import { AddIncidentModal } from "@/components/commissionnaire-modals/add-incident-modal"
import { getSingleCommissionnaire, updateCommissionnaire, deleteCommissionnaire } from "@/actions/commissionnaires"
import {
  CLASSEMENT_LABELS,
  INCIDENT_TYPE_LABELS,
  NIVEAU_LABELS,
  STATUT_COMMISSIONNAIRE_LABELS,
  type Commissionnaire,
  type CommissionnaireStatut,
} from "@/lib/types"
import { toast } from "sonner"

export default function CommissionnaireDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [commissionnaire, setCommissionnaire] = useState<Commissionnaire | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [showIncidentModal, setShowIncidentModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const reload = async () => {
    try {
      setCommissionnaire(await getSingleCommissionnaire(Number(id)))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  useEffect(() => {
    const load = async () => {
      await reload()
      setIsLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleStatutChange = async (statut: CommissionnaireStatut) => {
    if (!commissionnaire) return
    try {
      await updateCommissionnaire(commissionnaire.idCommissionnaire, { statut })
      await reload()
      toast.success("Statut mis à jour")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  const handleDelete = async () => {
    if (!commissionnaire) return
    if (!confirm("Supprimer ce commissionnaire ? Cette action est irréversible.")) return
    setIsDeleting(true)
    try {
      await deleteCommissionnaire(commissionnaire.idCommissionnaire)
      toast.success("Commissionnaire supprimé")
      router.push("/dashboard/commissionnaires")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!commissionnaire) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Commissionnaire non trouvé</h2>
        <Link href="/dashboard/commissionnaires">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
      </div>
    )
  }

  const dimensions = [
    { label: "Performance", value: commissionnaire.scorePerformance },
    { label: "Qualité", value: commissionnaire.scoreQualite },
    { label: "Discipline", value: commissionnaire.scoreDiscipline },
    { label: "Engagement", value: commissionnaire.scoreEngagement },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dashboard/commissionnaires">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowIncidentModal(true)}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Incident
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowScoreModal(true)}>
            <Star className="h-4 w-4 mr-2" />
            Évaluer
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive bg-transparent"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{commissionnaire.person?.fullName}</CardTitle>
                  <p className="text-muted-foreground mt-1">
                    {commissionnaire.code} {commissionnaire.zone ? `— ${commissionnaire.zone}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline">{NIVEAU_LABELS[commissionnaire.niveau]}</Badge>
                  <Badge className="bg-secondary text-secondary-foreground">
                    {CLASSEMENT_LABELS[commissionnaire.classement]}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {commissionnaire.person?.phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <Phone className="h-5 w-5 text-primary" />
                  <span>{commissionnaire.person.phone}</span>
                </div>
              )}

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Score global</h3>
                  <span className="text-2xl font-bold text-primary">
                    {Number(commissionnaire.scoreGlobal).toFixed(0)}/100
                  </span>
                </div>
                <div className="space-y-3">
                  {dimensions.map((dimension) => (
                    <div key={dimension.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{dimension.label}</span>
                        <span className="font-medium">{Number(dimension.value).toFixed(1)}/25</span>
                      </div>
                      <Progress value={(Number(dimension.value) / 25) * 100} />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              {!commissionnaire.incidents || commissionnaire.incidents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun incident enregistré</p>
              ) : (
                <div className="space-y-3">
                  {commissionnaire.incidents.map((incident) => (
                    <div key={incident.idIncident} className="p-3 rounded-lg bg-muted space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{INCIDENT_TYPE_LABELS[incident.type]}</span>
                        <Badge variant="outline" className="text-xs">
                          {incident.gravite}
                        </Badge>
                      </div>
                      {incident.description && (
                        <p className="text-sm text-muted-foreground">{incident.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        -{Number(incident.impactDiscipline)} pts discipline —{" "}
                        {new Date(incident.dateIncident).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Statut</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={commissionnaire.statut} onValueChange={handleStatutChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIF">Actif</SelectItem>
                  <SelectItem value="OBSERVATION">Observation</SelectItem>
                  <SelectItem value="SUSPENDU">Suspendu</SelectItem>
                  <SelectItem value="EXCLU">Exclu</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {STATUT_COMMISSIONNAIRE_LABELS[commissionnaire.statut]} — la suspension révoque
                immédiatement toute session active liée à un compte.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {commissionnaire.dateDebutActivite && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Début d'activité :</span>
                  <span className="font-medium">
                    {new Date(commissionnaire.dateDebutActivite).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ajouté le :</span>
                <span className="font-medium">
                  {new Date(commissionnaire.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <EditScoreModal
        open={showScoreModal}
        onOpenChange={setShowScoreModal}
        commissionnaire={commissionnaire}
        onUpdated={reload}
      />
      <AddIncidentModal
        open={showIncidentModal}
        onOpenChange={setShowIncidentModal}
        commissionnaire={commissionnaire}
        onAdded={reload}
      />
    </div>
  )
}
