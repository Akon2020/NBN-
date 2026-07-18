"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Check, X, Edit3, Loader2, Save } from "lucide-react"
import {
  MISSION_STATUT_LABELS,
  MISSION_TYPE_LABELS,
  type Mission,
  type MissionStatut,
} from "@/lib/types"
import { getSingleMission, updateMissionProgression, validateMission } from "@/actions/missions"
import { RejectMissionModal } from "@/components/commissionnaire-modals/reject-mission-modal"
import { EntityTimeline } from "@/components/entity-timeline"
import { toast } from "sonner"

const STATUT_BADGE_CLASS: Record<MissionStatut, string> = {
  SOUMISE: "bg-amber-500 text-white",
  VALIDEE: "bg-secondary text-secondary-foreground",
  REJETEE: "bg-destructive text-destructive-foreground",
  CORRECTION_DEMANDEE: "bg-muted text-muted-foreground",
}

export default function MissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [mission, setMission] = useState<Mission | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [modalMode, setModalMode] = useState<"REJETER" | "CORRECTION" | null>(null)
  const [progressionDraft, setProgressionDraft] = useState("0")
  const [savingProgression, setSavingProgression] = useState(false)

  const load = async () => {
    try {
      const data = await getSingleMission(Number(id))
      setMission(data)
      setProgressionDraft(String(data.progression))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleValidate = async () => {
    if (!mission) return
    try {
      const updated = await validateMission(mission.idMission)
      setMission(updated)
      toast.success("Mission validée")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  const handleSaveProgression = async () => {
    if (!mission) return
    const numeric = Number(progressionDraft)
    if (Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
      toast.error("L'avancement doit être un nombre entre 0 et 100.")
      return
    }
    setSavingProgression(true)
    try {
      const updated = await updateMissionProgression(mission.idMission, numeric)
      setMission(updated)
      toast.success("Avancement mis à jour")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSavingProgression(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!mission) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Mission non trouvée</h2>
        <Link href="/dashboard/missions">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux missions
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dashboard/missions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        {mission.statut === "SOUMISE" && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleValidate}>
              <Check className="h-4 w-4 mr-1" />
              Valider
            </Button>
            <Button size="sm" variant="outline" onClick={() => setModalMode("CORRECTION")}>
              <Edit3 className="h-4 w-4 mr-1" />
              Correction
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => setModalMode("REJETER")}
            >
              <X className="h-4 w-4 mr-1" />
              Rejeter
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-start justify-between flex-wrap gap-2">
                <CardTitle className="text-2xl">{MISSION_TYPE_LABELS[mission.type]}</CardTitle>
                <Badge className={STATUT_BADGE_CLASS[mission.statut]}>
                  {MISSION_STATUT_LABELS[mission.statut]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1">Responsable terrain</h3>
                {mission.commissionnaire ? (
                  <Link
                    href={`/dashboard/commissionnaires/${mission.commissionnaire.idCommissionnaire}`}
                    className="text-primary hover:underline"
                  >
                    {mission.commissionnaire.person?.fullName} ({mission.commissionnaire.code})
                  </Link>
                ) : (
                  <p className="text-muted-foreground">Commissionnaire #{mission.idCommissionnaire}</p>
                )}
              </div>

              {mission.property && (
                <div>
                  <h3 className="font-semibold mb-1">Bien concerné</h3>
                  <Link
                    href={
                      mission.property.category === "SALE"
                        ? `/dashboard/sales/${mission.property.idProperty}`
                        : `/dashboard/rentals/${mission.property.idProperty}`
                    }
                    className="text-primary hover:underline"
                  >
                    {[mission.property.avenue, mission.property.quartier].filter(Boolean).join(", ") ||
                      `Bien #${mission.property.idProperty}`}
                  </Link>
                </div>
              )}

              {mission.client && (
                <div>
                  <h3 className="font-semibold mb-1">Client concerné</h3>
                  <Link
                    href={`/dashboard/clients/${mission.client.idClient}`}
                    className="text-primary hover:underline"
                  >
                    {mission.client.person?.fullName || `Client #${mission.client.idClient}`}
                  </Link>
                </div>
              )}

              {mission.notes && (
                <div>
                  <h3 className="font-semibold mb-1">Notes</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{mission.notes}</p>
                </div>
              )}

              {mission.motifRejet && (
                <div>
                  <h3 className="font-semibold mb-1 text-destructive">Motif</h3>
                  <p className="text-destructive">{mission.motifRejet}</p>
                </div>
              )}

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Avancement terrain</h3>
                <div className="flex items-center gap-3 mb-2">
                  <Progress value={mission.progression} className="flex-1" />
                  <span className="text-sm font-medium w-12 text-right">{mission.progression}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={progressionDraft}
                    onChange={(e) => setProgressionDraft(e.target.value)}
                    className="w-24"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveProgression}
                    disabled={savingProgression}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {savingProgression ? "..." : "Enregistrer"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Déclaré par le commissionnaire assigné (ou un superviseur habilité à valider les
                  missions).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Soumise le : </span>
                <span className="font-medium">
                  {new Date(mission.createdAt).toLocaleString("fr-FR")}
                </span>
              </div>
              {mission.validatedAt && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Décision le : </span>
                  <span className="font-medium">
                    {new Date(mission.validatedAt).toLocaleString("fr-FR")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <EntityTimeline key={mission.updatedAt} entityType="MISSION" entityId={mission.idMission} />

      <RejectMissionModal
        open={modalMode !== null}
        onOpenChange={(open) => !open && setModalMode(null)}
        mission={mission}
        mode={modalMode || "REJETER"}
        onUpdated={setMission}
      />
    </div>
  )
}
