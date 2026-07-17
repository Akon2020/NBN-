"use client"

import { useEffect, useState, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Phone,
  Mail,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { EditBailleurModal } from "@/components/bailleur-modals/edit-bailleur-modal"
import { DeleteBailleurModal } from "@/components/bailleur-modals/delete-bailleur-modal"
import { EntityTimeline } from "@/components/entity-timeline"
import { getSingleBailleur } from "@/actions/bailleurs"
import {
  BAILLEUR_STATUT_LABELS,
  BAILLEUR_TYPE_LABELS,
  BAILLEUR_VALEUR_LABELS,
  type Bailleur,
} from "@/lib/types"
import { toast } from "sonner"

export default function BailleurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [bailleur, setBailleur] = useState<Bailleur | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setBailleur(await getSingleBailleur(Number(id)))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur inconnue")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!bailleur) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Bailleur non trouvé</h2>
        <Link href="/dashboard/bailleurs">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux bailleurs
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dashboard/bailleurs">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive bg-transparent"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{bailleur.person?.fullName}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-primary text-primary-foreground">
                      {BAILLEUR_TYPE_LABELS[bailleur.type]}
                    </Badge>
                    <Badge variant="secondary">{BAILLEUR_STATUT_LABELS[bailleur.statutRelation]}</Badge>
                    {bailleur.valeurBailleur && (
                      <Badge variant="outline">{BAILLEUR_VALEUR_LABELS[bailleur.valeurBailleur]}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {bailleur.person?.phone && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    <Phone className="h-5 w-5 text-primary" />
                    <span>{bailleur.person.phone}</span>
                  </div>
                )}
                {bailleur.person?.email && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    <Mail className="h-5 w-5 text-primary" />
                    <span>{bailleur.person.email}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Collaboration</h3>
                <p className="text-muted-foreground">
                  {bailleur.typeCollaboration || "Non renseigné"}
                  {bailleur.dureeCollaboration && ` — ${bailleur.dureeCollaboration}`}
                </p>
                {bailleur.fiabilite && (
                  <p className="text-muted-foreground mt-1">Fiabilité : {bailleur.fiabilite}</p>
                )}
              </div>

              {bailleur.exigencesFinancieres && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Exigences financières</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {bailleur.exigencesFinancieres}
                    </p>
                  </div>
                </>
              )}

              {bailleur.restrictions && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Restrictions</h3>
                    <p className="text-muted-foreground">{bailleur.restrictions}</p>
                  </div>
                </>
              )}

              {bailleur.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{bailleur.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {bailleur.margeAgence !== undefined && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Marge agence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold text-primary">
                    ${bailleur.margeAgence.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ajouté le :</span>
                <span className="font-medium">{new Date(bailleur.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Modifié le :</span>
                <span className="font-medium">{new Date(bailleur.updatedAt).toLocaleDateString("fr-FR")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <EntityTimeline key={bailleur.updatedAt} entityType="BAILLEUR" entityId={bailleur.idBailleur} />

      <EditBailleurModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        bailleur={bailleur}
        onEdit={setBailleur}
      />
      <DeleteBailleurModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        bailleur={bailleur}
        onDelete={() => router.push("/dashboard/bailleurs")}
      />
    </div>
  )
}
