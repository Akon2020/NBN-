"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2, ShieldAlert, Wallet } from "lucide-react"
import { CAISSE_STATUT_LABELS, type Caisse } from "@/lib/types"
import { getAllCaisses } from "@/actions/treasury"
import { AddCaisseModal } from "@/components/treasury-modals/add-caisse-modal"
import Link from "next/link"
import { toast } from "sonner"

export default function CaissesPage() {
  const [caisses, setCaisses] = useState<Caisse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setCaisses(await getAllCaisses())
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

  const handleAdd = (caisse: Caisse) => setCaisses([caisse, ...caisses])

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Accès non autorisé</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre rôle ne dispose pas de la permission pour consulter les caisses.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Caisses</h1>
          <p className="text-muted-foreground mt-2">
            Soldes multi-devises, un solde par devise et par caisse (CLAUDE.md §4)
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto bg-primary text-primary-foreground"
        >
          <Plus className="mr-2 h-4 w-4" />
          Créer une caisse
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : caisses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucune caisse</h3>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {caisses.map((caisse) => (
            <Link key={caisse.idCaisse} href={`/dashboard/caisses/${caisse.idCaisse}`}>
              <Card className="border-border h-full">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-lg">{caisse.label}</h3>
                    <Badge variant={caisse.statut === "OUVERTE" ? "default" : "outline"}>
                      {CAISSE_STATUT_LABELS[caisse.statut]}
                    </Badge>
                  </div>
                  {caisse.responsable && (
                    <p className="text-sm text-muted-foreground">
                      Responsable : {caisse.responsable.fullName}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    {caisse.balances?.map((balance) => (
                      <span
                        key={balance.currencyCode}
                        className="text-sm font-medium bg-muted px-2 py-1 rounded-md"
                      >
                        {Number(balance.balance).toLocaleString("fr-FR")} {balance.currencyCode}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <AddCaisseModal open={showAddModal} onOpenChange={setShowAddModal} onAdd={handleAdd} />
    </div>
  )
}
