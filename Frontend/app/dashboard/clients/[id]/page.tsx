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
  Target,
  MapPin,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { EditClientModal } from "@/components/client-modals/edit-client-modal"
import { DeleteClientModal } from "@/components/client-modals/delete-client-modal"
import { getSingleClient } from "@/actions/clients"
import {
  CLIENT_PIPELINE_LABELS,
  CLIENT_TYPE_LABELS,
  type Client,
} from "@/lib/types"
import { toast } from "sonner"

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setClient(await getSingleClient(Number(id)))
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

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Client non trouvé</h2>
        <Link href="/dashboard/clients">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux clients
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/clients">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <div className="flex gap-2">
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
                  <CardTitle className="text-2xl">{client.person?.fullName}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-primary text-primary-foreground">
                      {CLIENT_TYPE_LABELS[client.type]}
                    </Badge>
                    <Badge variant="secondary">{CLIENT_PIPELINE_LABELS[client.statutPipeline]}</Badge>
                    {client.score && <Badge variant="outline">{client.score}</Badge>}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {client.person?.phone && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    <Phone className="h-5 w-5 text-primary" />
                    <span>{client.person.phone}</span>
                  </div>
                )}
                {client.person?.email && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    <Mail className="h-5 w-5 text-primary" />
                    <span>{client.person.email}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Besoin
                </h3>
                <p className="text-muted-foreground">
                  {client.besoinTypeBien || "Non renseigné"}
                  {client.besoinUsage && ` — usage ${client.besoinUsage.toLowerCase()}`}
                </p>
                {(client.budgetMin || client.budgetMax) && (
                  <p className="text-muted-foreground mt-1">
                    Budget : ${client.budgetMin ?? "?"} — ${client.budgetMax ?? "?"}
                  </p>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Localisation recherchée
                </h3>
                <p className="text-muted-foreground">
                  {client.localisationQuartiers || "Non renseigné"}
                  {client.localisationVille && ` — ${client.localisationVille}`}
                </p>
              </div>

              {client.notesAgent && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Notes de l'agent</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{client.notesAgent}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Suivi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.source && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Source : </span>
                  <span className="font-medium">{client.source}</span>
                </div>
              )}
              {client.statutRelance && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Relance : </span>
                  <span className="font-medium">{client.statutRelance}</span>
                </div>
              )}
              {client.urgence && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Urgence : </span>
                  <span className="font-medium">{client.urgence}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ajouté le :</span>
                <span className="font-medium">{new Date(client.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Modifié le :</span>
                <span className="font-medium">{new Date(client.updatedAt).toLocaleDateString("fr-FR")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <EditClientModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        client={client}
        onEdit={setClient}
      />
      <DeleteClientModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        client={client}
        onDelete={() => router.push("/dashboard/clients")}
      />
    </div>
  )
}
