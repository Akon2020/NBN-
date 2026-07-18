"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Percent } from "lucide-react"
import { toast } from "sonner"
import {
  PROPERTY_TYPE_LABELS,
  STAY_TYPE_LABELS,
  type MarginSetting,
  type PropertyType,
  type StayType,
} from "@/lib/types"
import { getMarginSettings, updateMarginSetting } from "@/actions/marginSettings"

const draftKey = (propertyType: PropertyType, stayType: StayType) => `${propertyType}:${stayType}`

// GOAL 9/12 — centre de configuration des marges (préfigure GOAL 13). Ce
// panneau n'apparaît que si le Backend a effectivement renvoyé des
// données (property:margin:read) — jamais de vérification de permission
// côté Frontend, uniquement une réaction à ce que l'API a déjà décidé.
// Chaque type de bien a deux pourcentages indépendants : longue durée
// (location classique/vente) et courte durée (location à la journée).
export function MarginSettingsPanel() {
  const [settings, setSettings] = useState<MarginSetting[] | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMarginSettings()
        setSettings(data)
        setDrafts(
          Object.fromEntries(
            data.map((s) => [draftKey(s.propertyType, s.stayType), String(s.defaultPercentage)])
          )
        )
      } catch {
        setVisible(false)
      }
    }
    load()
  }, [])

  const grouped = useMemo(() => {
    if (!settings) return []
    const byType = new Map<PropertyType, MarginSetting[]>()
    for (const setting of settings) {
      const list = byType.get(setting.propertyType) || []
      list.push(setting)
      byType.set(setting.propertyType, list)
    }
    return Array.from(byType.entries())
  }, [settings])

  if (!visible) return null

  const handleSave = async (propertyType: PropertyType, stayType: StayType) => {
    const key = draftKey(propertyType, stayType)
    const raw = drafts[key]
    const numeric = Number(raw)
    if (raw === "" || Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
      toast.error("Le pourcentage doit être un nombre entre 0 et 100.")
      return
    }
    setSavingKey(key)
    try {
      const updated = await updateMarginSetting(propertyType, stayType, numeric)
      setSettings((prev) =>
        prev
          ? prev.map((s) =>
              s.propertyType === propertyType && s.stayType === stayType ? updated : s
            )
          : prev
      )
      toast.success(
        `Marge ${STAY_TYPE_LABELS[stayType].toLowerCase()} mise à jour pour ${PROPERTY_TYPE_LABELS[propertyType]}`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Marges par type de bien
        </CardTitle>
        <CardDescription>
          Pourcentage appliqué automatiquement au prix pour calculer la marge de chaque bien
          nouvellement créé, sauf override spécifique sur ce bien. La courte durée (location à la
          journée) a son propre pourcentage, indépendant de la longue durée.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {settings === null ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([propertyType, typeSettings]) => (
              <div key={propertyType} className="rounded-lg border border-border p-3 space-y-3">
                <span className="font-medium text-sm">{PROPERTY_TYPE_LABELS[propertyType]}</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {typeSettings.map((setting) => {
                    const key = draftKey(setting.propertyType, setting.stayType)
                    return (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {STAY_TYPE_LABELS[setting.stayType]}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            value={drafts[key] ?? ""}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSave(setting.propertyType, setting.stayType)}
                            disabled={savingKey === key}
                          >
                            {savingKey === key ? "..." : "Enregistrer"}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
