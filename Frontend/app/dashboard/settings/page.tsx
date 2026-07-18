"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { MarginSettingsPanel } from "@/components/margin-settings-panel"
import { getAppSettings, updateAppSetting, type CompanyInfo } from "@/actions/appSettings"

// GOAL 13 — centre de configuration réel : chaque champ ci-dessous est
// persisté côté Backend (/api/settings) et effectivement consulté
// ailleurs dans l'application (panier WhatsApp, message de proposition,
// impact des incidents sur le score commissionnaire) — plus aucun champ
// décoratif qui n'aurait d'effet nulle part.
export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(true)
  const [maxItems, setMaxItems] = useState("10")
  const [scoringEnabled, setScoringEnabled] = useState(true)
  const [company, setCompany] = useState<CompanyInfo>({
    name: "",
    phone: "",
    address: "",
    email: "",
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await getAppSettings()
        const maxItemsSetting = settings.find((s) => s.key === "cart.maxItems")
        const scoringSetting = settings.find((s) => s.key === "commissionnaire.scoringEnabled")
        const companySetting = settings.find((s) => s.key === "company.info")
        if (maxItemsSetting) setMaxItems(String(maxItemsSetting.value))
        if (scoringSetting) setScoringEnabled(Boolean(scoringSetting.value))
        if (companySetting) setCompany(companySetting.value as CompanyInfo)
      } catch {
        setVisible(false)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    const numericMaxItems = Number(maxItems)
    if (!maxItems || Number.isNaN(numericMaxItems) || numericMaxItems < 1) {
      toast.error("Le nombre maximum de biens doit être un nombre positif.")
      return
    }
    setSaving(true)
    try {
      await Promise.all([
        updateAppSetting("cart.maxItems", numericMaxItems),
        updateAppSetting("commissionnaire.scoringEnabled", scoringEnabled),
        updateAppSetting("company.info", company),
      ])
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Paramètres</h1>
        <p className="text-muted-foreground mt-2">Configurez les options de l'application</p>
      </div>

      {saved && (
        <Alert className="border-secondary bg-secondary/10">
          <CheckCircle2 className="h-4 w-4 text-secondary" />
          <AlertDescription>Vos paramètres ont été enregistrés avec succès</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {visible && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Paramètres généraux</CardTitle>
                <CardDescription>Configuration de base de l'application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="maxItems">Nombre maximum de biens dans le panier</Label>
                  <Input
                    id="maxItems"
                    type="number"
                    min="1"
                    max="50"
                    value={maxItems}
                    onChange={(e) => setMaxItems(e.target.value)}
                    className="max-w-xs"
                  />
                  <p className="text-sm text-muted-foreground">
                    Définit le nombre maximum de biens pouvant être ajoutés au panier WhatsApp
                    (bouton présent sur toutes les pages de liste des biens)
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Impact automatique des incidents sur le score</Label>
                    <p className="text-sm text-muted-foreground">
                      Un incident commissionnaire reste toujours enregistré ; ce réglage
                      détermine s&apos;il modifie aussi automatiquement le score discipline et la
                      grille d&apos;évolution
                    </p>
                  </div>
                  <Switch checked={scoringEnabled} onCheckedChange={setScoringEnabled} />
                </div>
              </CardContent>
            </Card>
          )}

          <MarginSettingsPanel />

          {visible && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Informations de l'entreprise</CardTitle>
                <CardDescription>
                  Coordonnées utilisées dans les propositions WhatsApp envoyées aux clients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nom de l'entreprise</Label>
                    <Input
                      id="companyName"
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Téléphone principal</Label>
                    <Input
                      id="companyPhone"
                      value={company.phone}
                      onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Adresse</Label>
                  <Input
                    id="companyAddress"
                    value={company.address}
                    onChange={(e) => setCompany({ ...company, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={company.email}
                    onChange={(e) => setCompany({ ...company, email: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {visible && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
