"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2, Phone, Eye, ShieldAlert, Users } from "lucide-react"
import {
  CLASSEMENT_LABELS,
  NIVEAU_LABELS,
  STATUT_COMMISSIONNAIRE_LABELS,
  type Commissionnaire,
  type CommissionnaireClassement,
} from "@/lib/types"
import { getAllCommissionnaires } from "@/actions/commissionnaires"
import { AddCommissionnaireModal } from "@/components/commissionnaire-modals/add-commissionnaire-modal"
import Link from "next/link"
import { toast } from "sonner"

const CLASSEMENT_BADGE_CLASS: Record<CommissionnaireClassement, string> = {
  ELITE: "bg-secondary text-secondary-foreground",
  TRES_PERFORMANT: "bg-secondary/70 text-secondary-foreground",
  MOYEN: "bg-amber-500 text-white",
  RISQUE: "bg-destructive text-destructive-foreground",
}

const STATUT_BADGE_VARIANT: Record<string, string> = {
  ACTIF: "bg-primary text-primary-foreground",
  OBSERVATION: "bg-amber-500 text-white",
  SUSPENDU: "bg-muted text-muted-foreground",
  EXCLU: "bg-destructive text-destructive-foreground",
}

export default function CommissionnairesPage() {
  const [commissionnaires, setCommissionnaires] = useState<Commissionnaire[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setCommissionnaires(await getAllCommissionnaires())
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

  const handleAdd = (commissionnaire: Commissionnaire) =>
    setCommissionnaires([commissionnaire, ...commissionnaires])

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Accès non autorisé</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre rôle ne dispose pas de la permission pour consulter les commissionnaires.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Commissionnaires</h1>
          <p className="text-muted-foreground mt-2">
            Pilotage des fiches terrain — score, niveau, statut (CDC §7)
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un commissionnaire
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : commissionnaires.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucun commissionnaire</h3>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {commissionnaires.map((commissionnaire) => (
            <Link key={commissionnaire.idCommissionnaire} href={`/dashboard/commissionnaires/${commissionnaire.idCommissionnaire}`}>
              <Card className="border-border h-full">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{commissionnaire.person?.fullName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {commissionnaire.code} {commissionnaire.zone ? `— ${commissionnaire.zone}` : ""}
                      </p>
                    </div>
                    <Badge className={STATUT_BADGE_VARIANT[commissionnaire.statut]}>
                      {STATUT_COMMISSIONNAIRE_LABELS[commissionnaire.statut]}
                    </Badge>
                  </div>

                  {commissionnaire.person?.phone && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {commissionnaire.person.phone}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{NIVEAU_LABELS[commissionnaire.niveau]}</Badge>
                      <Badge className={CLASSEMENT_BADGE_CLASS[commissionnaire.classement]}>
                        {CLASSEMENT_LABELS[commissionnaire.classement]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">
                        {Number(commissionnaire.scoreGlobal).toFixed(0)}
                      </span>
                      <span className="text-xs text-muted-foreground">/100</span>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <AddCommissionnaireModal open={showAddModal} onOpenChange={setShowAddModal} onAdd={handleAdd} />
    </div>
  )
}
