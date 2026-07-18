"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Edit, Trash2, UsersIcon, KeyRound, MonitorSmartphone, Loader2, ShieldAlert, Search } from "lucide-react"
import { AddUserModal } from "@/components/user-modals/add-user-modal"
import { EditUserModal } from "@/components/user-modals/edit-user-modal"
import { DeleteUserModal } from "@/components/user-modals/delete-user-modal"
import { ResetPasswordModal } from "@/components/user-modals/reset-password-modal"
import { SessionsModal } from "@/components/user-modals/sessions-modal"
import { getAllUsers } from "@/actions/users"
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/types"
import { User } from "@/types/type"
import { toast } from "sonner"

const ROLE_BADGE_CLASS: Record<string, string> = {
  admin: "bg-accent text-accent-foreground",
  technologique: "bg-primary text-primary-foreground",
  consultant: "bg-secondary text-secondary-foreground",
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [search, setSearch] = useState("")

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [showSessionsModal, setShowSessionsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setUsers(await getAllUsers())
      } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes("permission")) {
          setForbidden(true)
        } else {
          toast.error(error instanceof Error ? error.message : "Erreur inconnue")
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const handleAdd = (user: User) => setUsers([user, ...users])
  const handleEdit = (updatedUser: User) =>
    setUsers(users.map((u) => (u.idUser === updatedUser.idUser ? updatedUser : u)))
  const handleDelete = (id: number) => setUsers(users.filter((u) => u.idUser !== id))

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }
  const openDeleteModal = (user: User) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }
  const openResetModal = (user: User) => {
    setSelectedUser(user)
    setShowResetModal(true)
  }
  const openSessionsModal = (user: User) => {
    setSelectedUser(user)
    setShowSessionsModal(true)
  }

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [users, search])

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Accès non autorisé</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre rôle ne dispose pas de la permission pour consulter les utilisateurs.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Utilisateurs</h1>
          <p className="text-muted-foreground mt-2">Gérez les accès et les rôles des membres de l&apos;équipe</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un utilisateur
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.idUser} className="border-border">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <Avatar className="h-12 w-12 bg-primary text-primary-foreground shrink-0">
                      <AvatarFallback className="text-lg font-semibold">
                        {user.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg break-words">{user.fullName}</h3>
                        <Badge className={ROLE_BADGE_CLASS[user.role] || "bg-muted text-muted-foreground"}>
                          {ROLE_LABELS[user.role] || user.role}
                        </Badge>
                        <Badge variant={user.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                          {USER_STATUS_LABELS[user.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 break-words">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Membre depuis le {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(user)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openResetModal(user)}>
                      <KeyRound className="h-4 w-4 mr-2" />
                      Mot de passe
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openSessionsModal(user)}>
                      <MonitorSmartphone className="h-4 w-4 mr-2" />
                      Sessions
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
      )}

      {!isLoading && filteredUsers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UsersIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucun utilisateur</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Aucun résultat pour cette recherche" : "Commencez par ajouter des membres à votre équipe"}
          </p>
        </div>
      )}

      <AddUserModal open={showAddModal} onOpenChange={setShowAddModal} onAdd={handleAdd} />
      <EditUserModal open={showEditModal} onOpenChange={setShowEditModal} user={selectedUser} onEdit={handleEdit} />
      <DeleteUserModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        user={selectedUser}
        onDelete={handleDelete}
      />
      <ResetPasswordModal open={showResetModal} onOpenChange={setShowResetModal} user={selectedUser} />
      <SessionsModal open={showSessionsModal} onOpenChange={setShowSessionsModal} user={selectedUser} />
    </div>
  )
}
