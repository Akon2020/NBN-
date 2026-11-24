"use client"

import { useEffect, useState } from "react"
import { Building2, CheckCircle2, ClipboardList, Loader2, UserCheck, UserX } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/lib/axios"
import { apiErrorMessage } from "@/lib/apiError"
import { PROPERTY_KINDS } from "@/lib/propertyKinds"
import { cn } from "@/lib/utils"

type Period = "day" | "week" | "month" | "year"

interface Overview {
  period: Period
  demandes?: { recues: number; traitees: number }
  collectes: { total: number; parType: Record<string, number> }
  commissionnaires?: { actifs: number; inactifs: number }
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "year", label: "Cette année" },
]

// Bloc « Aperçu » (P1.10). Tous les calculs sont faits par l'API, bornes
// de période à l'heure de Bukavu ; un bloc absent de la réponse (permission
// manquante) n'est simplement pas affiché.
export function DashboardOverview() {
  const [period, setPeriod] = useState<Period>("day")
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<{ data: Overview }>("/api/dashboard/overview", { params: { period } })
      .then((res) => {
        if (!cancelled) {
          setData(res.data.data)
          setError("")
        }
      })
      .catch((err) => !cancelled && setError(apiErrorMessage(err, "Aperçu indisponible")))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [period])

  const tiles = data
    ? [
        ...(data.demandes
          ? [
              { label: "Demandes reçues", value: data.demandes.recues, icon: ClipboardList },
              { label: "Demandes traitées", value: data.demandes.traitees, icon: CheckCircle2 },
            ]
          : []),
        { label: "Collectes", value: data.collectes.total, icon: Building2 },
        ...(data.commissionnaires
          ? [
              { label: "Commissionnaires actifs", value: data.commissionnaires.actifs, icon: UserCheck },
              { label: "Commissionnaires inactifs", value: data.commissionnaires.inactifs, icon: UserX },
            ]
          : []),
      ]
    : []

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Aperçu</CardTitle>
        <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Période">
          {PERIODS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={period === option.value}
              onClick={() => setPeriod(option.value)}
              className={cn(
                "min-h-9 rounded-lg px-3 text-sm font-medium transition-colors",
                period === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !data ? (
          <div className="flex justify-center py-8" role="status">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
            <span className="sr-only">Chargement de l&apos;aperçu</span>
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : data ? (
          <div className={cn("space-y-4 transition-opacity", loading && "opacity-60")} aria-busy={loading}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {tiles.map((tile) => (
                <div key={tile.label} className="rounded-xl border border-border p-3">
                  <tile.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <p className="mt-2 text-2xl font-bold leading-none">{tile.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{tile.label}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Collectes par type</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6">
                {PROPERTY_KINDS.map((kind) => (
                  <div key={kind.value} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    <span className="truncate">{kind.label}</span>
                    <span className="font-semibold">{data.collectes.parType[kind.value] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
