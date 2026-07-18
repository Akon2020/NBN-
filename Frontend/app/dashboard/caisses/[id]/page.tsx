"use client"

import { useEffect, useState, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, ArrowLeftRight, Download, FileText, Loader2, Lock, Plus, Sheet } from "lucide-react"
import Link from "next/link"
import { getAllCaisses, getSingleCaisse, updateCaisse } from "@/actions/treasury"
import { getLedgerEntries } from "@/actions/payments"
import { downloadCaisseLedgerExport, downloadCaisseStatement } from "@/actions/reports"
import { RecordPaymentModal } from "@/components/treasury-modals/record-payment-modal"
import { TransferCaisseModal } from "@/components/treasury-modals/transfer-caisse-modal"
import { CAISSE_STATUT_LABELS, type Caisse, type LedgerEntry } from "@/lib/types"
import { toast } from "sonner"

export default function CaisseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [caisse, setCaisse] = useState<Caisse | null>(null)
  const [allCaisses, setAllCaisses] = useState<Caisse[]>([])
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const reload = async () => {
    try {
      const [caisseData, ledgerData, caissesData] = await Promise.all([
        getSingleCaisse(Number(id)),
        getLedgerEntries(),
        getAllCaisses(),
      ])
      setCaisse(caisseData)
      setLedger(ledgerData.filter((entry) => entry.idCaisse === Number(id)))
      setAllCaisses(caissesData)
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

  const handleClose = async () => {
    if (!caisse) return
    if (!confirm("Clôturer cette caisse ? Aucun nouveau paiement ne pourra y être enregistré.")) return
    setIsClosing(true)
    try {
      await updateCaisse(caisse.idCaisse, { statut: "CLOTUREE" })
      await reload()
      toast.success("Caisse clôturée")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsClosing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!caisse) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Caisse non trouvée</h2>
        <Link href="/dashboard/caisses">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dashboard/caisses">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadCaisseStatement(caisse.idCaisse)}>
                <FileText className="h-4 w-4 mr-2" />
                État de caisse (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadCaisseLedgerExport(caisse.idCaisse, "csv")}>
                <Sheet className="h-4 w-4 mr-2" />
                Ledger (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadCaisseLedgerExport(caisse.idCaisse, "xlsx")}>
                <Sheet className="h-4 w-4 mr-2" />
                Ledger (Excel)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {caisse.statut === "OUVERTE" && (
            <>
              <Button size="sm" onClick={() => setShowPaymentModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Enregistrer un paiement
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowTransferModal(true)}>
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Virement
              </Button>
              <Button variant="outline" size="sm" onClick={handleClose} disabled={isClosing}>
                <Lock className="h-4 w-4 mr-2" />
                Clôturer
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-2xl">{caisse.label}</CardTitle>
                <Badge variant={caisse.statut === "OUVERTE" ? "default" : "outline"}>
                  {CAISSE_STATUT_LABELS[caisse.statut]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {caisse.balances?.map((balance) => (
                  <div
                    key={balance.currencyCode}
                    className="p-4 rounded-lg bg-muted flex items-center justify-between"
                  >
                    <span className="text-sm text-muted-foreground">
                      Solde {balance.currencyCode}
                    </span>
                    <span className="text-xl font-bold text-primary">
                      {Number(balance.balance).toLocaleString("fr-FR")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Ledger (append-only)</CardTitle>
            </CardHeader>
            <CardContent>
              {ledger.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune écriture pour cette caisse</p>
              ) : (
                <div className="space-y-2">
                  {ledger.map((entry) => (
                    <div
                      key={entry.idLedgerEntry}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted text-sm"
                    >
                      <div>
                        <span
                          className={
                            entry.type === "ENTREE" ? "text-secondary-foreground font-medium" : "text-destructive font-medium"
                          }
                        >
                          {entry.type === "ENTREE" ? "+" : "-"}
                          {Number(entry.amount).toLocaleString("fr-FR")} {entry.currencyCode}
                        </span>
                        {entry.description && (
                          <p className="text-muted-foreground">{entry.description}</p>
                        )}
                      </div>
                      <div className="text-right text-muted-foreground">
                        <p>Solde : {Number(entry.balanceAfter).toLocaleString("fr-FR")}</p>
                        <p className="text-xs">
                          {new Date(entry.createdAt).toLocaleString("fr-FR")}
                        </p>
                      </div>
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
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {caisse.responsable && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Responsable : </span>
                  <span className="font-medium">{caisse.responsable.fullName}</span>
                </div>
              )}
              <div className="text-sm">
                <span className="text-muted-foreground">Créée le : </span>
                <span className="font-medium">
                  {new Date(caisse.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <RecordPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        caisse={caisse}
        onRecorded={reload}
      />
      <TransferCaisseModal
        open={showTransferModal}
        onOpenChange={setShowTransferModal}
        caisses={allCaisses}
        sourceCaisseId={caisse.idCaisse}
        onTransferred={reload}
      />
    </div>
  )
}
