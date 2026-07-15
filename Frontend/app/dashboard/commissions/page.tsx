"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2, ShieldAlert, Percent, Clock, CreditCard } from "lucide-react"
import {
  COMMISSION_BENEFICIAIRE_LABELS,
  COMMISSION_STATUT_LABELS,
  type Commission,
  type CommissionStatut,
} from "@/lib/types"
import { getAllCommissions } from "@/actions/commissions"
import { AddCommissionModal } from "@/components/treasury-modals/add-commission-modal"
import { MarkCommissionDueModal } from "@/components/treasury-modals/mark-commission-due-modal"
import { PayLinkedModal } from "@/components/treasury-modals/pay-linked-modal"
import { toast } from "sonner"

const STATUT_BADGE_CLASS: Record<CommissionStatut, string> = {
  CALCULEE: "bg-muted text-muted-foreground",
  DUE: "bg-amber-500 text-white",
  PAYEE: "bg-secondary text-secondary-foreground",
  ANNULEE: "bg-destructive text-destructive-foreground",
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selected, setSelected] = useState<Commission | null>(null)
  const [showDueModal, setShowDueModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setCommissions(await getAllCommissions())
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

  const handleAdd = (commission: Commission) => setCommissions([commission, ...commissions])
  const handleUpdated = (updated: Commission) =>
    setCommissions(
      commissions.map((c) => (c.idCommission === updated.idCommission ? updated : c))
    )

  const beneficiaireLabel = (commission: Commission) => {
    if (commission.beneficiaireType === "COMMISSIONNAIRE") {
      return commission.commissionnaire?.person?.fullName || commission.commissionnaire?.code
    }
    if (commission.beneficiaireType === "AGENT") {
      return commission.beneficiaireUser?.fullName
    }
    return "Agence"
  }

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Accès non autorisé</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre rôle ne dispose pas de la permission pour consulter les commissions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Commissions</h1>
          <p className="text-muted-foreground mt-2">
            Agence, agent ou commissionnaire — calculées sur une transaction conclue
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto bg-primary text-primary-foreground"
        >
          <Plus className="mr-2 h-4 w-4" />
          Calculer une commission
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : commissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Percent className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucune commission</h3>
        </div>
      ) : (
        <div className="grid gap-4">
          {commissions.map((commission) => (
            <Card key={commission.idCommission} className="border-border">
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">
                      {COMMISSION_BENEFICIAIRE_LABELS[commission.beneficiaireType]} —{" "}
                      {beneficiaireLabel(commission)}
                    </span>
                    <Badge className={STATUT_BADGE_CLASS[commission.statut]}>
                      {COMMISSION_STATUT_LABELS[commission.statut]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {Number(commission.montantCommission).toLocaleString("fr-FR")}{" "}
                    {commission.currencyCode}
                    {commission.tauxCommission &&
                      ` (${commission.tauxCommission}% de ${Number(commission.montantTransaction).toLocaleString("fr-FR")})`}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {commission.statut === "CALCULEE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelected(commission)
                        setShowDueModal(true)
                      }}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Marquer due
                    </Button>
                  )}
                  {commission.statut === "DUE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelected(commission)
                        setShowPayModal(true)
                      }}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Payer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddCommissionModal open={showAddModal} onOpenChange={setShowAddModal} onAdd={handleAdd} />
      <MarkCommissionDueModal
        open={showDueModal}
        onOpenChange={setShowDueModal}
        commission={selected}
        onUpdated={handleUpdated}
      />
      {selected && showPayModal && selected.idCaisse && (
        <PayLinkedModal
          open={showPayModal}
          onOpenChange={setShowPayModal}
          title="Payer la commission"
          type="DECAISSEMENT"
          amount={Number(selected.montantCommission)}
          currencyCode={selected.currencyCode}
          idCaisse={selected.idCaisse}
          idCommission={selected.idCommission}
          onPaid={(payment) => {
            void payment
            setCommissions((prev) =>
              prev.map((c) =>
                c.idCommission === selected.idCommission ? { ...c, statut: "PAYEE" } : c
              )
            )
            toast.success("Décaissement enregistré")
          }}
        />
      )}
    </div>
  )
}
