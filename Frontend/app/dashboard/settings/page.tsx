"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, CheckCircle2 } from "lucide-react"

export default function SettingsPage() {
  const [maxGroupSize, setMaxGroupSize] = useState("6")
  const [autoSaveLocation, setAutoSaveLocation] = useState(true)
  const [enableScoring, setEnableScoring] = useState(true)
  const [enableNotifications, setEnableNotifications] = useState(true)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // Simulate save
    localStorage.setItem("maxGroupSize", maxGroupSize)
    localStorage.setItem("autoSaveLocation", autoSaveLocation.toString())
    localStorage.setItem("enableScoring", enableScoring.toString())
    localStorage.setItem("enableNotifications", enableNotifications.toString())

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
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

      {/* General Settings */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Paramètres généraux</CardTitle>
          <CardDescription>Configuration de base de l'application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="maxGroupSize">Nombre maximum de biens à grouper</Label>
            <Input
              id="maxGroupSize"
              type="number"
              min="1"
              max="20"
              value={maxGroupSize}
              onChange={(e) => setMaxGroupSize(e.target.value)}
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              Définit le nombre maximum de biens pouvant être sélectionnés pour une proposition groupée
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Sauvegarde automatique de la localisation GPS</Label>
              <p className="text-sm text-muted-foreground">
                Enregistre automatiquement les coordonnées GPS lors de l'ajout d'un bien
              </p>
            </div>
            <Switch checked={autoSaveLocation} onCheckedChange={setAutoSaveLocation} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Scoring automatique des biens</Label>
              <p className="text-sm text-muted-foreground">
                Active le calcul automatique du score pour chaque bien ajouté
              </p>
            </div>
            <Switch checked={enableScoring} onCheckedChange={setEnableScoring} />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Gérez vos préférences de notification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Activer les notifications</Label>
              <p className="text-sm text-muted-foreground">Recevez des alertes sur les nouvelles activités</p>
            </div>
            <Switch checked={enableNotifications} onCheckedChange={setEnableNotifications} />
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Informations de l'entreprise</CardTitle>
          <CardDescription>Coordonnées pour les propositions clients</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nom de l'entreprise</Label>
              <Input id="companyName" defaultValue="Nyumbani Express" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Téléphone principal</Label>
              <Input id="companyPhone" defaultValue="+243 999 000 111" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyAddress">Adresse</Label>
            <Input id="companyAddress" defaultValue="Avenue de la Paix, Bukavu, Sud-Kivu, RDC" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyEmail">Email</Label>
            <Input id="companyEmail" type="email" defaultValue="contact@nyumbani.cd" />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-primary text-primary-foreground">
          <Save className="mr-2 h-4 w-4" />
          Enregistrer les paramètres
        </Button>
      </div>
    </div>
  )
}
