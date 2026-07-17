"use client"

import { useEffect, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2, Phone, ShieldAlert, GripVertical } from "lucide-react"
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
import { cn } from "@/lib/utils"

// GOAL 7 — pipeline commercial en vrai Kanban : glisser une carte dans une
// autre colonne appelle exactement le même endpoint que l'ancien bouton
// "avancer" (PATCH /api/clients/:id, statutPipeline) — aucune règle de
// transition n'est imposée côté Frontend (le Backend l'accepte déjà telle
// quelle, CLAUDE.md §2.2), donc sauter une étape en un seul glissement
// fonctionne sans code supplémentaire.

function ClientCard({ client }: { client: Client }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: client.idClient,
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn("border-border touch-none", isDragging && "opacity-40")}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-1">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            aria-label="Déplacer"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Link href={`/dashboard/clients/${client.idClient}`} className="min-w-0 flex-1">
            <p className="font-medium text-sm line-clamp-1 hover:underline">
              {client.person?.fullName || `Client #${client.idClient}`}
            </p>
            {client.dossierNumber && (
              <p className="text-[10px] font-mono text-muted-foreground">{client.dossierNumber}</p>
            )}
          </Link>
        </div>
        <div className="flex items-center justify-between pl-5">
          <Badge variant="outline" className="text-xs">
            {CLIENT_TYPE_LABELS[client.type]}
          </Badge>
          {client.score && (
            <Badge className="text-xs bg-secondary text-secondary-foreground">{client.score}</Badge>
          )}
        </div>
        {client.person?.phone && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground pl-5">
            <Phone className="h-3 w-3" />
            {client.person.phone}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PipelineColumn({
  stage,
  clients,
}: {
  stage: ClientStatutPipeline
  clients: Client[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-sm">{CLIENT_PIPELINE_LABELS[stage]}</h3>
        <Badge variant="secondary">{clients.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-3 min-h-[120px] rounded-lg p-1 transition-colors",
          isOver && "bg-primary/5 ring-2 ring-primary/30"
        )}
      >
        {clients.map((client) => (
          <ClientCard key={client.idClient} client={client} />
        ))}
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeClient, setActiveClient] = useState<Client | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

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

  const handleDragStart = (event: DragStartEvent) => {
    const client = clients.find((c) => c.idClient === event.active.id)
    setActiveClient(client || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveClient(null)
    const { active, over } = event
    if (!over) return

    const client = clients.find((c) => c.idClient === active.id)
    const nextStage = over.id as ClientStatutPipeline
    if (!client || client.statutPipeline === nextStage) return

    const previousClients = clients
    setClients(clients.map((c) => (c.idClient === client.idClient ? { ...c, statutPipeline: nextStage } : c)))

    try {
      const updated = await updateClient(client.idClient, { statutPipeline: nextStage })
      setClients((prev) => prev.map((c) => (c.idClient === client.idClient ? updated : c)))
      toast.success(`Déplacé vers « ${CLIENT_PIPELINE_LABELS[nextStage]} »`)
    } catch (error) {
      setClients(previousClients)
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
            Glissez une carte vers une autre étape pour faire progresser (ou sauter) le pipeline
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
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-flow-col auto-cols-[280px] gap-4 overflow-x-auto pb-4">
            {CLIENT_PIPELINE_STAGES.map((stage) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                clients={clients.filter((c) => c.statutPipeline === stage)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeClient && (
              <Card className="border-primary shadow-lg w-[260px]">
                <CardContent className="p-3">
                  <p className="font-medium text-sm line-clamp-1">
                    {activeClient.person?.fullName || `Client #${activeClient.idClient}`}
                  </p>
                </CardContent>
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <AddClientModal open={showAddModal} onOpenChange={setShowAddModal} onAdd={handleAdd} />
    </div>
  )
}
