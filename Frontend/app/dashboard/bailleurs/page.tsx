"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2, Phone, Eye, Edit, Trash2, ShieldAlert, Building2 } from "lucide-react"
import {
  BAILLEUR_STATUT_LABELS,
  BAILLEUR_TYPE_LABELS,
  BAILLEUR_VALEUR_LABELS,
  type Bailleur,
} from "@/lib/types"
import { getAllBailleurs } from "@/actions/bailleurs"
import { AddBailleurModal } from "@/components/bailleur-modals/add-bailleur-modal"
import { EditBailleurModal } from "@/components/bailleur-modals/edit-bailleur-modal"
import { DeleteBailleurModal } from "@/components/bailleur-modals/delete-bailleur-modal"
import Link from "next/link"
import { toast } from "sonner"

export default function BailleursPage() {
  const [bailleurs, setBailleurs] = useState<Bailleur[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedBailleur, setSelectedBailleur] = useState<Bailleur | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setBailleurs(await getAllBailleurs())
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

  const handleAdd = (bailleur: Bailleur) => setBailleurs([bailleur, ...bailleurs])
  const handleEdit = (updated: Bailleur) =>
    setBailleurs(bailleurs.map((b) => (b.idBailleur === updated.idBailleur ? updated : b)))
  const handleDelete = (id: number) => {
    setBailleurs(bailleurs.filter((b) => b.idBailleur !== id))
    setShowDeleteModal(false)
  }

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Accès non autorisé</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre rôle ne dispose pas de la permission pour consulter les bailleurs.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Bailleurs</h1>
          <p className="text-muted-foreground mt-2">Fiches VIP des propriétaires et mandataires</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un bailleur
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : bailleurs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucun bailleur</h3>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {bailleurs.map((bailleur) => (
            <Card key={bailleur.idBailleur} className="border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/dashboard/bailleurs/${bailleur.idBailleur}`}>
                      <h3 className="font-semibold text-lg hover:underline">{bailleur.person?.fullName}</h3>
                    </Link>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {BAILLEUR_TYPE_LABELS[bailleur.type]}
                    </Badge>
                  </div>
                  <Badge
                    className={
                      bailleur.statutRelation === "ACTIF"
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {BAILLEUR_STATUT_LABELS[bailleur.statutRelation]}
                  </Badge>
                </div>

                {bailleur.person?.phone && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {bailleur.person.phone}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    {bailleur.valeurBailleur && (
                      <Badge variant="secondary" className="text-xs">
                        {BAILLEUR_VALEUR_LABELS[bailleur.valeurBailleur]}
                      </Badge>
                    )}
                    {bailleur.margeAgence !== undefined && (
                      <div className="text-sm font-semibold text-primary mt-1">
                        Marge : ${bailleur.margeAgence.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Link href={`/dashboard/bailleurs/${bailleur.idBailleur}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedBailleur(bailleur)
                        setShowEditModal(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        setSelectedBailleur(bailleur)
                        setShowDeleteModal(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddBailleurModal open={showAddModal} onOpenChange={setShowAddModal} onAdd={handleAdd} />
      <EditBailleurModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        bailleur={selectedBailleur}
        onEdit={handleEdit}
      />
      <DeleteBailleurModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        bailleur={selectedBailleur}
        onDelete={handleDelete}
      />
    </div>
  )
}
