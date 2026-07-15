"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2, Phone, ChevronRight, ShieldAlert } from "lucide-react"
import {
  CLIENT_PIPELINE_LABELS,
  CLIENT_PIPELINE_STAGES,
  CLIENT_TYPE_LABELS,
  type Client,
  type ClientStatutPipeline,
} from "@/lib/types"
import { getAllClients, updateClient } from "@/actions/clients"
import { AddClientModal } from "@/components/client-modals/add-client-modal"
import Link from "next/link"
import { toast } from "sonner"

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setClients(await getAllClients())
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

  const handleAdd = (client: Client) => setClients([client, ...clients])

  const advanceStage = async (client: Client, nextStage: ClientStatutPipeline) => {
    try {
      const updated = await updateClient(client.idClient, { statutPipeline: nextStage })
      setClients(clients.map((c) => (c.idClient === client.idClient ? updated : c)))
      toast.success("Statut mis à jour")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Accès non autorisé</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre rôle ne dispose pas de la permission pour consulter les clients.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Clients — Pipeline commercial</h1>
          <p className="text-muted-foreground mt-2">
            Suivez la progression des prospects du premier contact à la conclusion
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un client
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-flow-col auto-cols-[280px] gap-4 overflow-x-auto pb-4">
          {CLIENT_PIPELINE_STAGES.map((stage) => {
            const stageClients = clients.filter((c) => c.statutPipeline === stage)
            const nextIndex = CLIENT_PIPELINE_STAGES.indexOf(stage) + 1
            const nextStage =
              stage !== "PERDU" && nextIndex < CLIENT_PIPELINE_STAGES.length - 1
                ? CLIENT_PIPELINE_STAGES[nextIndex]
                : null

            return (
              <div key={stage} className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-semibold text-sm">{CLIENT_PIPELINE_LABELS[stage]}</h3>
                  <Badge variant="secondary">{stageClients.length}</Badge>
                </div>
                <div className="flex flex-col gap-3 min-h-[100px]">
                  {stageClients.map((client) => (
                    <Card key={client.idClient} className="border-border">
                      <CardContent className="p-3 space-y-2">
                        <Link href={`/dashboard/clients/${client.idClient}`}>
                          <p className="font-medium text-sm line-clamp-1 hover:underline">
                            {client.person?.fullName || `Client #${client.idClient}`}
                          </p>
                        </Link>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {CLIENT_TYPE_LABELS[client.type]}
                          </Badge>
                          {client.score && (
                            <Badge className="text-xs bg-secondary text-secondary-foreground">
                              {client.score}
                            </Badge>
                          )}
                        </div>
                        {client.person?.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {client.person.phone}
                          </div>
                        )}
                        {nextStage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-7 text-xs justify-between"
                            onClick={() => advanceStage(client, nextStage)}
                          >
                            {CLIENT_PIPELINE_LABELS[nextStage]}
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AddClientModal open={showAddModal} onOpenChange={setShowAddModal} onAdd={handleAdd} />
    </div>
  )
}
