"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Check,
  X,
  MessageSquare,
  Loader2,
  ShieldAlert,
  FileText,
  CreditCard,
  Download,
  Plus,
} from "lucide-react"
import { REQUISITION_STATUT_LABELS, type Requisition, type RequisitionStatut } from "@/lib/types"
import { approveRequisition, getAllRequisitions, openRequisitionPdf } from "@/actions/requisitions"
import { AddRequisitionModal } from "@/components/treasury-modals/add-requisition-modal"
import { DecideRequisitionModal } from "@/components/treasury-modals/decide-requisition-modal"
import { PayLinkedModal } from "@/components/treasury-modals/pay-linked-modal"
import { toast } from "sonner"

const STATUT_BADGE_CLASS: Record<RequisitionStatut, string> = {
  SOUMISE: "bg-amber-500 text-white",
  COMPLEMENT_DEMANDE: "bg-muted text-muted-foreground",
  APPROUVEE: "bg-secondary text-secondary-foreground",
  REJETEE: "bg-destructive text-destructive-foreground",
}

export default function RequisitionsPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [decideMode, setDecideMode] = useState<"REJETER" | "COMPLEMENT" | null>(null)
  const [selected, setSelected] = useState<Requisition | null>(null)
  const [showPayModal, setShowPayModal] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setRequisitions(await getAllRequisitions())
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

  const handleAdd = (requisition: Requisition) => setRequisitions([requisition, ...requisitions])
  const handleUpdated = (updated: Requisition) =>
    setRequisitions(requisitions.map((r) => (r.idRequisition === updated.idRequisition ? updated : r)))

  const handleApprove = async (requisition: Requisition) => {
    try {
      const updated = await approveRequisition(requisition.idRequisition)
      handleUpdated(updated)
      toast.success("Réquisition approuvée")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  const handleDownload = async (requisition: Requisition) => {
    try {
      await openRequisitionPdf(requisition.idRequisition)
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
          Votre rôle ne dispose pas de la permission pour soumettre des réquisitions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Réquisitions de fonds</h1>
          <p className="text-muted-foreground mt-2">
            Saisie → Vérification → Approbation → Génération → Archivage
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto bg-primary text-primary-foreground"
        >
          <Plus className="mr-2 h-4 w-4" />
          Soumettre une réquisition
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : requisitions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucune réquisition</h3>
        </div>
      ) : (
        <div className="grid gap-4">
          {requisitions.map((requisition) => (
            <Card key={requisition.idRequisition} className="border-border">
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{requisition.nature}</span>
                    <Badge className={STATUT_BADGE_CLASS[requisition.statut]}>
                      {REQUISITION_STATUT_LABELS[requisition.statut]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {requisition.demandeur?.fullName} — {requisition.caisse?.label} —{" "}
                    {Number(requisition.coutEstime).toLocaleString("fr-FR")}{" "}
                    {requisition.currencyCode}
                  </p>
                  {requisition.motifDecision && (
                    <p className="text-sm text-destructive mt-1">
                      Motif : {requisition.motifDecision}
                    </p>
                  )}
                  {requisition.validationCode && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Code : {requisition.validationCode}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {requisition.statut === "SOUMISE" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleApprove(requisition)}>
                        <Check className="h-4 w-4 mr-1" />
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(requisition)
                          setDecideMode("COMPLEMENT")
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Complément
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => {
                          setSelected(requisition)
                          setDecideMode("REJETER")
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rejeter
                      </Button>
                    </>
                  )}
                  {requisition.statut === "APPROUVEE" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(requisition)
                          setShowPayModal(true)
                        }}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Payer
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDownload(requisition)}>
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddRequisitionModal open={showAddModal} onOpenChange={setShowAddModal} onAdd={handleAdd} />
      <DecideRequisitionModal
        open={decideMode !== null}
        onOpenChange={(open) => !open && setDecideMode(null)}
        requisition={selected}
        mode={decideMode || "REJETER"}
        onUpdated={handleUpdated}
      />
      {selected && showPayModal && (
        <PayLinkedModal
          open={showPayModal}
          onOpenChange={setShowPayModal}
          title="Payer la réquisition"
          type="DECAISSEMENT"
          amount={Number(selected.coutEstime)}
          currencyCode={selected.currencyCode}
          idCaisse={selected.idCaisse}
          idRequisition={selected.idRequisition}
          onPaid={() => {
            toast.success("Décaissement enregistré")
          }}
        />
      )}
    </div>
  )
}
