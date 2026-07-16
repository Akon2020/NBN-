"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, X, Edit3, Loader2, ShieldAlert, ClipboardList } from "lucide-react"
import {
  MISSION_STATUT_LABELS,
  MISSION_TYPE_LABELS,
  type Mission,
  type MissionStatut,
} from "@/lib/types"
import { getAllMissions, validateMission } from "@/actions/missions"
import { RejectMissionModal } from "@/components/commissionnaire-modals/reject-mission-modal"
import { toast } from "sonner"

const STATUT_BADGE_CLASS: Record<MissionStatut, string> = {
  SOUMISE: "bg-amber-500 text-white",
  VALIDEE: "bg-secondary text-secondary-foreground",
  REJETEE: "bg-destructive text-destructive-foreground",
  CORRECTION_DEMANDEE: "bg-muted text-muted-foreground",
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [modalMode, setModalMode] = useState<"REJETER" | "CORRECTION" | null>(null)
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setMissions(await getAllMissions())
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

  const handleValidate = async (mission: Mission) => {
    try {
      const updated = await validateMission(mission.idMission)
      setMissions(missions.map((m) => (m.idMission === updated.idMission ? updated : m)))
      toast.success("Mission validée")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  const openModal = (mission: Mission, mode: "REJETER" | "CORRECTION") => {
    setSelectedMission(mission)
    setModalMode(mode)
  }

  const handleUpdated = (updated: Mission) => {
    setMissions(missions.map((m) => (m.idMission === updated.idMission ? updated : m)))
  }

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Accès non autorisé</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre rôle ne dispose pas de la permission pour consulter les missions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Missions terrain</h1>
        <p className="text-muted-foreground mt-2">
          Validation des soumissions des commissionnaires (collecte, apport client, suivi)
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : missions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucune mission soumise</h3>
        </div>
      ) : (
        <div className="grid gap-4">
          {missions.map((mission) => (
            <Card key={mission.idMission} className="border-border">
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{MISSION_TYPE_LABELS[mission.type]}</span>
                    <Badge className={STATUT_BADGE_CLASS[mission.statut]}>
                      {MISSION_STATUT_LABELS[mission.statut]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mission.commissionnaire?.person?.fullName || `Commissionnaire #${mission.idCommissionnaire}`}
                    {" — "}
                    {new Date(mission.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                  {mission.notes && <p className="text-sm text-muted-foreground mt-1">{mission.notes}</p>}
                  {mission.motifRejet && (
                    <p className="text-sm text-destructive mt-1">Motif : {mission.motifRejet}</p>
                  )}
                </div>

                {mission.statut === "SOUMISE" && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleValidate(mission)}>
                      <Check className="h-4 w-4 mr-1" />
                      Valider
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openModal(mission, "CORRECTION")}>
                      <Edit3 className="h-4 w-4 mr-1" />
                      Correction
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => openModal(mission, "REJETER")}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rejeter
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RejectMissionModal
        open={modalMode !== null}
        onOpenChange={(open) => !open && setModalMode(null)}
        mission={selectedMission}
        mode={modalMode || "REJETER"}
        onUpdated={handleUpdated}
      />
    </div>
  )
}
