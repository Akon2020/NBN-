"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, CheckCircle2, Loader2, User } from "lucide-react"
import Cookies from "js-cookie"

interface UserProfile {
  idUser: number
  fullName: string
  email: string
  role: string
  avatar: string | null
  status: string
  createdAt: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [maxGroupSize, setMaxGroupSize] = useState("6")
  const [autoSaveLocation, setAutoSaveLocation] = useState(true)
  const [enableScoring, setEnableScoring] = useState(true)
  const [enableNotifications, setEnableNotifications] = useState(true)

  const [profileSaved, setProfileSaved] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [error, setError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const token = Cookies.get("token")
      if (!token) {
        setError("Vous devez être connecté")
        setProfileLoading(false)
        return
      }

      const response = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Impossible de charger le profil")
      }

      const data = await response.json()
      setProfile(data)
      setFullName(data.fullName || "")
      setEmail(data.email || "")
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement du profil")
    } finally {
      setProfileLoading(false)
    }
  }

  const handleProfileSave = async () => {
    setError("")
    setProfileSaving(true)

    try {
      const token = Cookies.get("token")
      if (!token) {
        setError("Vous devez être connecté")
        return
      }

      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName,
          email,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Erreur lors de la mise à jour")
      }

      const updatedUser = await response.json()
      setProfile(updatedUser)
      localStorage.setItem("user", JSON.stringify(updatedUser))

      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour du profil")
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    setPasswordError("")
    setPasswordSuccess("")

    if (newPassword.length < 6) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 6 caractères")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas")
      return
    }

    setPasswordSaving(true)

    try {
      const token = Cookies.get("token")
      if (!token) {
        setPasswordError("Vous devez être connecté")
        return
      }

      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Erreur lors du changement de mot de passe")
      }

      setPasswordSuccess("Mot de passe modifié avec succès")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setPasswordSuccess(""), 3000)
    } catch (err: any) {
      setPasswordError(err.message || "Erreur lors du changement de mot de passe")
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleSettingsSave = () => {
    localStorage.setItem("maxGroupSize", maxGroupSize)
    localStorage.setItem("autoSaveLocation", autoSaveLocation.toString())
    localStorage.setItem("enableScoring", enableScoring.toString())
    localStorage.setItem("enableNotifications", enableNotifications.toString())

    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 3000)
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Administrateur"
      case "agent": return "Agent terrain"
      case "consultant": return "Consultant"
      default: return role
    }
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Paramètres</h1>
        <p className="text-muted-foreground mt-2">Gérez votre profil et configurez l'application</p>
      </div>

      {profileSaved && (
        <Alert className="border-secondary bg-secondary/10">
          <CheckCircle2 className="h-4 w-4 text-secondary" />
          <AlertDescription>Votre profil a été mis à jour avec succès</AlertDescription>
        </Alert>
      )}

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Mon profil
          </CardTitle>
          <CardDescription>Vos informations personnelles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Votre nom complet"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Input value={profile ? getRoleLabel(profile.role) : ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Input value={profile?.status === "ACTIVE" ? "Actif" : "Inactif"} disabled className="bg-muted" />
            </div>
          </div>

          {profile && (
            <p className="text-sm text-muted-foreground">
              Membre depuis le {new Date(profile.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={handleProfileSave} disabled={profileSaving} className="bg-primary text-primary-foreground">
              {profileSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer le profil
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Changer le mot de passe</CardTitle>
          <CardDescription>Mettez à jour votre mot de passe de connexion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordError && (
            <Alert variant="destructive">
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>
          )}
          {passwordSuccess && (
            <Alert className="border-secondary bg-secondary/10">
              <CheckCircle2 className="h-4 w-4 text-secondary" />
              <AlertDescription>{passwordSuccess}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 caractères"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmez le mot de passe"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handlePasswordChange} disabled={passwordSaving} variant="outline">
              {passwordSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Modification...
                </>
              ) : (
                "Changer le mot de passe"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {settingsSaved && (
        <Alert className="border-secondary bg-secondary/10">
          <CheckCircle2 className="h-4 w-4 text-secondary" />
          <AlertDescription>Vos paramètres ont été enregistrés avec succès</AlertDescription>
        </Alert>
      )}

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

      <div className="flex justify-end">
        <Button onClick={handleSettingsSave} className="bg-primary text-primary-foreground">
          <Save className="mr-2 h-4 w-4" />
          Enregistrer les paramètres
        </Button>
      </div>
    </div>
  )
}
