"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Home, ImageIcon, TrendingUp, Users, Star } from "lucide-react"
import { useEffect, useState } from "react"

export default function DashboardPage() {
  const [userName, setUserName] = useState("")

  useEffect(() => {
    setUserName(localStorage.getItem("user_name") || "Utilisateur")
  }, [])

  const stats = [
    {
      title: "Biens à louer",
      value: "127",
      icon: Home,
      change: "+12%",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Biens à vendre",
      value: "43",
      icon: Building2,
      change: "+8%",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Total d'images",
      value: "892",
      icon: ImageIcon,
      change: "+24%",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Propositions envoyées",
      value: "156",
      icon: TrendingUp,
      change: "+18%",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Favoris",
      value: "34",
      icon: Star,
      change: "+5%",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Utilisateurs actifs",
      value: "12",
      icon: Users,
      change: "+2",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Bienvenue, {userName}</h1>
        <p className="text-muted-foreground mt-2">Voici un aperçu de votre activité sur Nyumbani Express</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="text-secondary font-medium">{stat.change}</span> depuis le mois dernier
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Nouveau bien à louer ajouté</p>
                <p className="text-xs text-muted-foreground">Appartement 3 chambres, Kadutu - Il y a 2 heures</p>
              </div>
            </div>
            <div className="flex items-center gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                <Building2 className="h-5 w-5 text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Bien vendu marqué</p>
                <p className="text-xs text-muted-foreground">Maison 5 chambres, Ibanda - Il y a 5 heures</p>
              </div>
            </div>
            <div className="flex items-center gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Proposition envoyée via WhatsApp</p>
                <p className="text-xs text-muted-foreground">6 biens proposés à Jean Mukendi - Il y a 1 jour</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
