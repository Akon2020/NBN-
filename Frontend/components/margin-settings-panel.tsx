"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Percent } from "lucide-react"
import { toast } from "sonner"
import { PROPERTY_TYPE_LABELS, type MarginSetting } from "@/lib/types"
import { getMarginSettings, updateMarginSetting } from "@/actions/marginSettings"

// GOAL 9 — centre de configuration des marges (préfigure GOAL 13). Ce
// panneau n'apparaît que si le Backend a effectivement renvoyé des
// données (property:margin:read) — jamais de vérification de permission
// côté Frontend, uniquement une réaction à ce que l'API a déjà décidé.
export function MarginSettingsPanel() {
  const [settings, setSettings] = useState<MarginSetting[] | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingType, setSavingType] = useState<string | null>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMarginSettings()
        setSettings(data)
        setDrafts(
          Object.fromEntries(data.map((s) => [s.propertyType, String(s.defaultPercentage)]))
        )
      } catch {
        setVisible(false)
      }
    }
    load()
  }, [])

  if (!visible) return null

  const handleSave = async (propertyType: MarginSetting["propertyType"]) => {
    const raw = drafts[propertyType]
    const numeric = Number(raw)
    if (raw === "" || Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
      toast.error("Le pourcentage doit être un nombre entre 0 et 100.")
      return
    }
    setSavingType(propertyType)
    try {
      const updated = await updateMarginSetting(propertyType, numeric)
      setSettings((prev) =>
        prev ? prev.map((s) => (s.propertyType === propertyType ? updated : s)) : prev
      )
      toast.success(`Marge par défaut mise à jour pour ${PROPERTY_TYPE_LABELS[propertyType]}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSavingType(null)
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
          nouvellement créé, sauf override spécifique sur ce bien.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {settings === null ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {settings.map((setting) => (
              <div
                key={setting.propertyType}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border p-3"
              >
                <span className="font-medium text-sm">
                  {PROPERTY_TYPE_LABELS[setting.propertyType]}
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={drafts[setting.propertyType] ?? ""}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [setting.propertyType]: e.target.value }))
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSave(setting.propertyType)}
                    disabled={savingType === setting.propertyType}
                  >
                    {savingType === setting.propertyType ? "..." : "Enregistrer"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
