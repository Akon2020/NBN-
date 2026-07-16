"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileSpreadsheet, FileText, Loader2, ShieldAlert, Wallet } from "lucide-react"
import { toast } from "sonner"
import { Caisse } from "@/lib/types"
import { getAllCaisses } from "@/actions/treasury"
import {
  downloadCaisseStatement,
  downloadCommissionsExport,
  downloadPropertiesExport,
} from "@/actions/reports"

export default function RapportsPage() {
  const [caisses, setCaisses] = useState<Caisse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  const [selectedCaisse, setSelectedCaisse] = useState("")
  const [caisseFrom, setCaisseFrom] = useState("")
  const [caisseTo, setCaisseTo] = useState("")
  const [generatingCaisse, setGeneratingCaisse] = useState(false)

  const [propertiesFormat, setPropertiesFormat] = useState<"csv" | "xlsx">("csv")
  const [generatingProperties, setGeneratingProperties] = useState(false)

  const [commissionsFormat, setCommissionsFormat] = useState<"csv" | "xlsx">("csv")
  const [commissionsFrom, setCommissionsFrom] = useState("")
  const [commissionsTo, setCommissionsTo] = useState("")
  const [generatingCommissions, setGeneratingCommissions] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const list = await getAllCaisses()
        setCaisses(list)
        if (list.length) setSelectedCaisse(String(list[0].idCaisse))
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

  const handleCaisseStatement = async () => {
    if (!selectedCaisse) {
      toast.error("Sélectionnez une caisse")
      return
    }
    setGeneratingCaisse(true)
    try {
      await downloadCaisseStatement(Number(selectedCaisse), caisseFrom || undefined, caisseTo || undefined)
      toast.success("État de caisse généré")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setGeneratingCaisse(false)
    }
  }

  const handlePropertiesExport = async () => {
    setGeneratingProperties(true)
    try {
      await downloadPropertiesExport(propertiesFormat)
      toast.success("Export des biens généré")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setGeneratingProperties(false)
    }
  }

  const handleCommissionsExport = async () => {
    setGeneratingCommissions(true)
    try {
      await downloadCommissionsExport(
        commissionsFormat,
        commissionsFrom || undefined,
        commissionsTo || undefined
      )
      toast.success("Export des commissions généré")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setGeneratingCommissions(false)
    }
  }

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Accès non autorisé</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre rôle ne dispose pas de la permission pour générer des rapports.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Rapports</h1>
        <p className="text-muted-foreground mt-2">
          Génération à la demande — rien n&apos;est stocké côté serveur, chaque export reflète
          l&apos;état actuel des données.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                <CardTitle>État de caisse (PDF)</CardTitle>
              </div>
              <CardDescription>Relevé stylisé des mouvements d&apos;une caisse.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Caisse</Label>
                <Select value={selectedCaisse} onValueChange={setSelectedCaisse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une caisse" />
                  </SelectTrigger>
                  <SelectContent>
                    {caisses.map((c) => (
                      <SelectItem key={c.idCaisse} value={String(c.idCaisse)}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Du (optionnel)</Label>
                  <Input type="date" value={caisseFrom} onChange={(e) => setCaisseFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Au (optionnel)</Label>
                  <Input type="date" value={caisseTo} onChange={(e) => setCaisseTo(e.target.value)} />
                </div>
              </div>
              <Button
                onClick={handleCaisseStatement}
                disabled={generatingCaisse || !caisses.length}
                className="gap-2 w-full sm:w-auto"
              >
                <FileText className="h-4 w-4" />
                {generatingCaisse ? "Génération..." : "Télécharger le PDF"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Catalogue de biens</CardTitle>
              </div>
              <CardDescription>
                Export complet (respecte la protection de la marge selon votre rôle).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={propertiesFormat} onValueChange={(v) => setPropertiesFormat(v as "csv" | "xlsx")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel (xlsx)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handlePropertiesExport}
                disabled={generatingProperties}
                className="gap-2 w-full sm:w-auto"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {generatingProperties ? "Génération..." : "Télécharger l'export"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Commissions</CardTitle>
              </div>
              <CardDescription>Export des commissions sur une période donnée.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select
                    value={commissionsFormat}
                    onValueChange={(v) => setCommissionsFormat(v as "csv" | "xlsx")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel (xlsx)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Du (optionnel)</Label>
                  <Input type="date" value={commissionsFrom} onChange={(e) => setCommissionsFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Au (optionnel)</Label>
                  <Input type="date" value={commissionsTo} onChange={(e) => setCommissionsTo(e.target.value)} />
                </div>
              </div>
              <Button
                onClick={handleCommissionsExport}
                disabled={generatingCommissions}
                className="gap-2 w-full sm:w-auto"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {generatingCommissions ? "Génération..." : "Télécharger l'export"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
