"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Coins,
  Handshake,
  ListChecks,
  Loader2,
  MapPin,
  Plus,
  UserRound,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  declareFieldAgentConclusion,
  getFieldAgentClients,
  getFieldAgentCommissions,
  getFieldAgentOverview,
  getFieldAgentProperties,
  getFieldAgentTasks,
  updateFieldAgentTaskStatus,
  type AmountsByCurrency,
  type FieldAgentClient,
  type FieldAgentCommission,
  type FieldAgentOverview,
  type FieldAgentProperty,
  type FieldAgentTask,
} from "@/actions/fieldAgent"
import { propertyKindLabel } from "@/lib/propertyKinds"
import { toast } from "sonner"

const TASK_STATUT: Record<FieldAgentTask["statut"], { label: string; className: string }> = {
  A_FAIRE: { label: "À faire", className: "bg-muted text-foreground" },
  EN_COURS: { label: "En cours", className: "bg-primary-900 text-white" },
  EN_REVISION: { label: "Conclusion à valider", className: "bg-warning-500 text-neutral-900" },
  TERMINEE: { label: "Terminée", className: "bg-success-500 text-white" },
}

const PIPELINE: Record<string, string> = {
  NOUVEAU: "Nouveau",
  PROPOSE: "Biens proposés",
  VISITE_PROGRAMMEE: "Visite programmée",
  VISITE_EFFECTUEE: "Visite effectuée",
  NEGOCIATION: "Négociation",
  CONCLU: "Conclu",
  PERDU: "Perdu",
}

// En attente (calculée) → Prête (due, à retirer en caisse) → Payée.
const COMMISSION_STATUT: Record<FieldAgentCommission["statut"], { label: string; className: string }> = {
  CALCULEE: { label: "En attente", className: "bg-muted text-foreground" },
  DUE: { label: "Prête", className: "bg-warning-500 text-neutral-900" },
  PAYEE: { label: "Payée", className: "bg-success-500 text-white" },
  ANNULEE: { label: "Annulée", className: "bg-error-500 text-white" },
}

const formatAmounts = (amounts: AmountsByCurrency) => {
  const entries = Object.entries(amounts)
  return entries.length ? entries.map(([currency, value]) => `${value.toLocaleString("fr-FR")} ${currency}`).join(" + ") : "0"
}

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString("fr-FR") : "")

export default function FieldAgentSpacePage() {
  const [overview, setOverview] = useState<FieldAgentOverview | null>(null)
  const [tasks, setTasks] = useState<FieldAgentTask[]>([])
  const [properties, setProperties] = useState<FieldAgentProperty[]>([])
  const [clients, setClients] = useState<FieldAgentClient[]>([])
  const [commissions, setCommissions] = useState<FieldAgentCommission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [concluding, setConcluding] = useState<FieldAgentTask | null>(null)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [o, t, p, c, m] = await Promise.all([
        getFieldAgentOverview(),
        getFieldAgentTasks(),
        getFieldAgentProperties(),
        getFieldAgentClients(),
        getFieldAgentCommissions(),
      ])
      setOverview(o)
      setTasks(t)
      setProperties(p)
      setClients(c)
      setCommissions(m)
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      if (/fiche/i.test(message)) setMissing(true)
      else toast.error(message || "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const changeStatus = async (task: FieldAgentTask, statut: FieldAgentTask["statut"]) => {
    try {
      await updateFieldAgentTaskStatus(task.idTask, statut)
      setTasks((list) => list.map((t) => (t.idTask === task.idTask ? { ...t, statut } : t)))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  const conclude = async () => {
    if (!concluding) return
    setBusy(true)
    try {
      toast.success(await declareFieldAgentConclusion(concluding.idTask, note.trim()))
      setTasks((list) => list.map((t) => (t.idTask === concluding.idTask ? { ...t, statut: "EN_REVISION" } : t)))
      setConcluding(null)
      setNote("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setBusy(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Chargement de votre espace</span>
      </div>
    )
  }

  if (missing || !overview) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <UserRound className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
        <h1 className="text-lg font-semibold">Aucune fiche commissionnaire liée à ce compte</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Cet espace est réservé aux commissionnaires et collecteurs de l&apos;agence.
        </p>
      </div>
    )
  }

  const { fiche, stats } = overview
  const cards = [
    { label: "Biens enregistrés", value: stats.biensEnregistres, icon: Building2 },
    { label: "Clients en cours", value: stats.clientsEnCours, icon: Handshake },
    { label: "Clients traités", value: stats.clientsTraites, icon: CheckCircle2 },
    { label: "Tâches ouvertes", value: stats.tachesOuvertes, icon: ListChecks },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {fiche.profil === "COLLECTEUR" ? "Espace collecteur" : "Espace commissionnaire"}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">{fiche.person?.fullName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
            <Badge variant="outline" className="font-mono">
              {fiche.code}
            </Badge>
            {fiche.zone && (
              <span className="inline-flex items-center gap-1 text-sm">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {fiche.zone}
              </span>
            )}
          </p>
        </div>
        <Button asChild className="bg-accent-600 text-white hover:bg-accent-600/90">
          <Link href="/collecte-bien">
            <Plus className="mr-2 h-4 w-4" />
            Collecter un bien
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="border-border">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-900/10 text-primary-900 dark:bg-white/10 dark:text-white">
                <card.icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block text-2xl font-bold leading-none">{card.value}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{card.label}</span>
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-4 w-4" aria-hidden />
            Mes commissions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "En attente", value: stats.commissions.enAttente, hint: "Calculées, en attente de paiement" },
            { label: "Prêtes", value: stats.commissions.pretes, hint: "À retirer à la caisse" },
            { label: "Payées", value: stats.commissions.payees, hint: "Déjà reçues" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold">{formatAmounts(item.value)}</p>
              <p className="text-xs text-muted-foreground">{item.hint}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Tabs defaultValue="taches">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="taches">Tâches ({tasks.length})</TabsTrigger>
          <TabsTrigger value="biens">Mes biens ({properties.length})</TabsTrigger>
          <TabsTrigger value="clients">Mes clients ({clients.length})</TabsTrigger>
          <TabsTrigger value="commissions">Commissions ({commissions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="taches" className="space-y-3 pt-2">
          {tasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucune tâche ne vous est assignée pour le moment.</p>
          ) : (
            tasks.map((task) => (
              <Card key={task.idTask} className="border-border">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{task.title}</p>
                      {task.description && <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>}
                      {task.dateEcheance && (
                        <p className="mt-1 text-xs text-muted-foreground">Échéance : {formatDate(task.dateEcheance)}</p>
                      )}
                    </div>
                    <Badge className={TASK_STATUT[task.statut].className}>{TASK_STATUT[task.statut].label}</Badge>
                  </div>
                  {task.statut !== "TERMINEE" && task.statut !== "EN_REVISION" && (
                    <div className="flex flex-wrap gap-2">
                      {task.statut === "A_FAIRE" && (
                        <Button size="sm" variant="outline" onClick={() => changeStatus(task, "EN_COURS")}>
                          Commencer
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => changeStatus(task, "TERMINEE")}>
                        Marquer terminée
                      </Button>
                      <Button
                        size="sm"
                        className="bg-success-500 text-white hover:bg-success-500/90"
                        onClick={() => setConcluding(task)}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Déclarer conclue
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="biens" className="space-y-3 pt-2">
          {properties.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
              Aucun bien enregistré avec votre code.
              <Button asChild size="sm" variant="outline">
                <Link href="/collecte-bien">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Collecter un bien
                </Link>
              </Button>
            </div>
          ) : (
            properties.map((property) => (
              <Card key={property.idProperty} className="border-border">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {propertyKindLabel(property.propertyType)} {property.category === "RENT" ? "à louer" : "à vendre"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[property.avenue, property.quartier, property.commune].filter(Boolean).join(", ")} · NBN-
                      {property.idProperty}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(property.createdAt)}</span>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="clients" className="space-y-3 pt-2">
          {clients.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun client n&apos;a encore indiqué votre code.</p>
          ) : (
            clients.map((client) => (
              <Card key={client.idClient} className="border-border">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{client.person?.fullName}</p>
                    <p className="text-sm text-muted-foreground">{client.dossierNumber}</p>
                  </div>
                  <Badge variant="outline">{PIPELINE[client.statutPipeline] ?? client.statutPipeline}</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="commissions" className="space-y-3 pt-2">
          {commissions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune commission pour le moment. Elle est calculée après validation d&apos;une conclusion par l&apos;agence.
            </p>
          ) : (
            commissions.map((commission) => (
              <Card key={commission.idCommission} className="border-border">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">
                      {Number(commission.montantCommission).toLocaleString("fr-FR")} {commission.currencyCode}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {commission.client?.dossierNumber ?? ""} · {formatDate(commission.createdAt)}
                    </p>
                  </div>
                  <Badge className={COMMISSION_STATUT[commission.statut].className}>
                    {COMMISSION_STATUT[commission.statut].label}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(concluding)} onOpenChange={(open) => !open && setConcluding(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Déclarer la tâche conclue</DialogTitle>
            <DialogDescription>
              {concluding?.title}. L&apos;agence vérifie puis valide ; votre commission est calculée après cette validation.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Ex. bail signé le 24 novembre, client installé"
            aria-label="Précisions pour l'agence"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConcluding(null)}>
              Annuler
            </Button>
            <Button onClick={conclude} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transmettre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
