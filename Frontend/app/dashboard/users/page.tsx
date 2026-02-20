"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Trash2, UsersIcon, Loader2 } from "lucide-react"
import { AddUserModal } from "@/components/user-modals/add-user-modal"
import { EditUserModal } from "@/components/user-modals/edit-user-modal"
import { DeleteUserModal } from "@/components/user-modals/delete-user-modal"
import Cookies from "js-cookie"

export interface UserData {
  idUser: number
  fullName: string
  email: string
  role: "admin" | "agent" | "consultant"
  status: "ACTIVE" | "INACTIVE"
  avatar: string | null
  lastLoginAt: string | null
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const token = Cookies.get("token")
      if (!token) {
        setError("Vous devez être connecté")
        setLoading(false)
        return
      }

      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Impossible de charger les utilisateurs")
      }

      const data = await response.json()
      setUsers(data)
      setError("")
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des utilisateurs")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const openEditModal = (user: UserData) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const openDeleteModal = (user: UserData) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Utilisateurs</h1>
          <p className="text-muted-foreground mt-2">Gérez les accès et les rôles des membres de l'équipe</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un utilisateur
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.idUser} className="border-border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 bg-primary text-primary-foreground">
                    <AvatarFallback className="text-lg font-semibold">
                      {user.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{user.fullName}</h3>
                      <Badge className={getRoleBadgeColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                      <Badge variant={user.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                        {user.status === "ACTIVE" ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Membre depuis le {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditModal(user)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive bg-transparent"
                    onClick={() => openDeleteModal(user)}
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

      {users.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UsersIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucun utilisateur</h3>
          <p className="text-sm text-muted-foreground mt-1">Commencez par ajouter des membres à votre équipe</p>
        </div>
      )}

      <AddUserModal open={showAddModal} onOpenChange={setShowAddModal} onSuccess={fetchUsers} />
      <EditUserModal open={showEditModal} onOpenChange={setShowEditModal} user={selectedUser} onSuccess={fetchUsers} />
      <DeleteUserModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        user={selectedUser}
        onSuccess={fetchUsers}
      />
    </div>
  )
}
