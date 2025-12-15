"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Edit, Trash2, UsersIcon } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "agent" | "consultant"
  status: "active" | "inactive"
  createdAt: Date
}

const mockUsers: User[] = [
  {
    id: "1",
    name: "Jean Mukendi",
    email: "jean.mukendi@nyumbani.cd",
    role: "admin",
    status: "active",
    createdAt: new Date("2025-01-01"),
  },
  {
    id: "2",
    name: "Marie Zawadi",
    email: "marie.zawadi@nyumbani.cd",
    role: "agent",
    status: "active",
    createdAt: new Date("2025-01-05"),
  },
  {
    id: "3",
    name: "Paul Mwamba",
    email: "paul.mwamba@nyumbani.cd",
    role: "consultant",
    status: "active",
    createdAt: new Date("2025-01-10"),
  },
  {
    id: "4",
    name: "Grace Kabuo",
    email: "grace.kabuo@nyumbani.cd",
    role: "agent",
    status: "inactive",
    createdAt: new Date("2024-12-15"),
  },
]

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers)

  const handleDelete = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
      setUsers(users.filter((u) => u.id !== id))
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-accent text-accent-foreground"
      case "agent":
        return "bg-primary text-primary-foreground"
      case "consultant":
        return "bg-secondary text-secondary-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrateur",
      agent: "Agent terrain",
      consultant: "Consultant",
    }
    return labels[role] || role
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Utilisateurs</h1>
          <p className="text-muted-foreground mt-2">Gérez les accès et les rôles des membres de l'équipe</p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un utilisateur
        </Button>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id} className="border-border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 bg-primary text-primary-foreground">
                    <AvatarFallback className="text-lg font-semibold">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{user.name}</h3>
                      <Badge className={getRoleBadgeColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                      <Badge variant={user.status === "active" ? "default" : "secondary"} className="text-xs">
                        {user.status === "active" ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Membre depuis le {user.createdAt.toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive bg-transparent"
                    onClick={() => handleDelete(user.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UsersIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucun utilisateur</h3>
          <p className="text-sm text-muted-foreground mt-1">Commencez par ajouter des membres à votre équipe</p>
        </div>
      )}
    </div>
  )
}
