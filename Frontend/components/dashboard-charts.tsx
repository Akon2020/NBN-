"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { getDashboardCharts } from "@/actions/dashboard"
import {
  CLIENT_PIPELINE_LABELS,
  PROPERTY_STATUT_LABELS,
  PROPERTY_TYPE_LABELS,
  type DashboardCharts as DashboardChartsData,
} from "@/lib/types"
import { toast } from "sonner"

// GOAL 19 — palette dérivée des tokens de marque NBN (CLAUDE.md §10),
// recharts a besoin de couleurs littérales (pas de classes Tailwind dans
// le SVG), donc dupliquées ici plutôt que réutilisées via une classe.
const PALETTE = ["#14294a", "#c13f0b", "#245640", "#2f7350", "#f59e0b", "#5b6472"]

const formatMonth = (month: string) => {
  const [year, m] = month.split("-")
  const date = new Date(Number(year), Number(m) - 1, 1)
  return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardCharts() {
  const [data, setData] = useState<DashboardChartsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cashflowCurrency, setCashflowCurrency] = useState<string>("")
  const [commissionCurrency, setCommissionCurrency] = useState<string>("")

  useEffect(() => {
    getDashboardCharts()
      .then((charts) => {
        setData(charts)
        const cashflowCurrencies = Array.from(
          new Set((charts.cashflowByMonth || []).map((r) => r.currencyCode))
        )
        setCashflowCurrency(cashflowCurrencies.includes("USD") ? "USD" : cashflowCurrencies[0] || "")
        const commissionCurrencies = Array.from(
          new Set((charts.commissionsByMonth || []).map((r) => r.currencyCode))
        )
        setCommissionCurrency(
          commissionCurrencies.includes("USD") ? "USD" : commissionCurrencies[0] || ""
        )
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Erreur inconnue"))
      .finally(() => setIsLoading(false))
  }, [])

  const cashflowCurrencies = useMemo(
    () => Array.from(new Set((data?.cashflowByMonth || []).map((r) => r.currencyCode))),
    [data]
  )
  const commissionCurrencies = useMemo(
    () => Array.from(new Set((data?.commissionsByMonth || []).map((r) => r.currencyCode))),
    [data]
  )

  const cashflowSeries = useMemo(() => {
    if (!data?.cashflowByMonth) return []
    const byMonth = new Map<string, { month: string; entree: number; sortie: number }>()
    for (const row of data.cashflowByMonth) {
      if (row.currencyCode !== cashflowCurrency) continue
      if (!byMonth.has(row.month)) byMonth.set(row.month, { month: row.month, entree: 0, sortie: 0 })
      const entry = byMonth.get(row.month)!
      if (row.type === "ENTREE") entry.entree = row.total
      else entry.sortie = row.total
    }
    return Array.from(byMonth.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => ({ ...row, label: formatMonth(row.month) }))
  }, [data, cashflowCurrency])

  const commissionSeries = useMemo(() => {
    if (!data?.commissionsByMonth) return []
    const byMonth = new Map<string, { month: string; total: number }>()
    for (const row of data.commissionsByMonth) {
      if (row.currencyCode !== commissionCurrency) continue
      if (!byMonth.has(row.month)) byMonth.set(row.month, { month: row.month, total: 0 })
      byMonth.get(row.month)!.total += row.total
    }
    return Array.from(byMonth.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => ({ ...row, label: formatMonth(row.month) }))
  }, [data, commissionCurrency])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const propertiesByType = data.propertiesByType.map((row) => ({
    name: PROPERTY_TYPE_LABELS[row.propertyType] || row.propertyType,
    count: row.count,
  }))
  const propertiesByStatut = data.propertiesByStatut.map((row) => ({
    name: PROPERTY_STATUT_LABELS[row.statut] || row.statut,
    count: row.count,
  }))

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Graphiques</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Biens par type">
          <PieChart>
            <Pie data={propertiesByType} dataKey="count" nameKey="name" outerRadius={90} label>
              {propertiesByType.map((entry, index) => (
                <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ChartCard>

        <ChartCard title="Biens par statut">
          <BarChart data={propertiesByStatut}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#14294a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        {data.clientPipeline && (
          <ChartCard title="Pipeline commercial (clients)">
            <BarChart
              data={data.clientPipeline.map((row) => ({
                name: CLIENT_PIPELINE_LABELS[row.statutPipeline] || row.statutPipeline,
                count: row.count,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#245640" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>
        )}

        {data.commissionnairePerformance && (
          <ChartCard title="Top commissionnaires (score global)">
            <BarChart data={data.commissionnairePerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="fullName" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="scoreGlobal" fill="#c13f0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartCard>
        )}

        {data.cashflowByMonth && (
          <Card className="border-border lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-base">Trésorerie mensuelle (entrées / sorties)</CardTitle>
              {cashflowCurrencies.length > 1 && (
                <Select value={cashflowCurrency} onValueChange={setCashflowCurrency}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cashflowCurrencies.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cashflowSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="entree" name="Entrées" stroke="#245640" strokeWidth={2} />
                    <Line type="monotone" dataKey="sortie" name="Sorties" stroke="#c13f0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {data.commissionsByMonth && (
          <Card className="border-border lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-base">Commissions par mois</CardTitle>
              {commissionCurrencies.length > 1 && (
                <Select value={commissionCurrency} onValueChange={setCommissionCurrency}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commissionCurrencies.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commissionSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" name="Commissions" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
