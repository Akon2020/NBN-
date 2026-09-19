"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, BellRing, CalendarClock, Check, Loader2, Mail, MessageCircle, Plus } from "lucide-react"
import { getAllBailleurs } from "@/actions/bailleurs"
import {
  cancelBailleurRelance,
  createBailleurRelance,
  getBailleurRelance,
  getBailleurRelances,
  markRelanceMessageSent,
} from "@/actions/bailleurRelances"
import { bailleurWhatsAppLink, DEFAULT_BAILLEUR_MESSAGE } from "@/lib/bailleurContact"
import { normalizePhone } from "@/lib/contactValidation"
import {
  BAILLEUR_MESSAGE_STATUT_LABELS,
  BAILLEUR_PRIORITE_LABELS,
  BAILLEUR_PRIORITES,
  BAILLEUR_RELANCE_STATUT_LABELS,
  type Bailleur,
  type BailleurPriorite,
  type BailleurRelance,
  type BailleurRelanceChannel,
  type BailleurRelanceDetail,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })

// Valeur par défaut du champ date : demain à 9 h, heure locale de l'agent.
const tomorrowAtNine = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(9, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`
}

function CreateRelanceDialog({
  bailleurs,
  open,
  onOpenChange,
  onCreated,
}: {
  bailleurs: Bailleur[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (idRelance: number) => void
}) {
  const [channel, setChannel] = useState<BailleurRelanceChannel>("EMAIL")
  const [scheduledAt, setScheduledAt] = useState(tomorrowAtNine())
  const [subject, setSubject] = useState("Des nouvelles de vos biens, {nom}")
  const [message, setMessage] = useState(DEFAULT_BAILLEUR_MESSAGE)
  const [priorite, setPriorite] = useState<BailleurPriorite | "">("")
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setScheduledAt(tomorrowAtNine())
      setSelectedIds([])
    }
  }, [open])

  // Seuls les bailleurs joignables par le canal choisi sont proposés.
  const reachable = useMemo(
    () =>
      bailleurs.filter(
        (b) =>
          (!priorite || b.priorite === priorite) &&
          (channel === "EMAIL" ? Boolean(b.person?.email) : Boolean(normalizePhone(b.person?.phone || "")))
      ),
    [bailleurs, channel, priorite]
  )
  const selectedReachable = selectedIds.filter((id) => reachable.some((b) => b.idBailleur === id))
  const allSelected = reachable.length > 0 && reachable.every((b) => selectedIds.includes(b.idBailleur))

  const handleCreate = async () => {
    if (!scheduledAt) return toast.error("Choisissez la date de la relance.")
    setIsSaving(true)
    try {
      const result = await createBailleurRelance({
        channel,
        idBailleurs: selectedReachable,
        scheduledAt: new Date(scheduledAt).toISOString(),
        subject: channel === "EMAIL" ? subject.trim() : undefined,
        message: message.trim(),
      })
      toast.success(
        result.statut === "PLANIFIEE"
          ? `Relance programmée pour ${result.recipients} bailleur(s)`
          : `Relance lancée pour ${result.recipients} bailleur(s)`
      )
      onOpenChange(false)
      onCreated(result.idRelance)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouvelle relance</DialogTitle>
          <DialogDescription>
            Date, bailleurs et moyen de relance. Les e-mails partent tout seuls depuis contact@ ; pour WhatsApp,
            vous recevez une notification à la date prévue avec les messages prêts à envoyer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="relance-date">Date et heure</Label>
              <Input id="relance-date" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Moyen de relance</Label>
              <div className="flex gap-2">
                {(["EMAIL", "WHATSAPP"] as BailleurRelanceChannel[]).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={channel === value ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setChannel(value)}
                  >
                    {value === "EMAIL" ? <Mail className="mr-2 h-4 w-4" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                    {value === "EMAIL" ? "E-mail" : "WhatsApp"}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Bailleurs ({selectedReachable.length} sélectionné(s))</Label>
              <div className="flex flex-wrap gap-1">
                {BAILLEUR_PRIORITES.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={priorite === value ? "default" : "outline"}
                    onClick={() => setPriorite(priorite === value ? "" : value)}
                  >
                    {BAILLEUR_PRIORITE_LABELS[value]}
                  </Button>
                ))}
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 px-2 text-sm font-medium">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() =>
                  setSelectedIds(
                    allSelected
                      ? selectedIds.filter((id) => !reachable.some((b) => b.idBailleur === id))
                      : [...new Set([...selectedIds, ...reachable.map((b) => b.idBailleur)])]
                  )
                }
              />
              Tout sélectionner ({reachable.length} joignable(s) par {channel === "EMAIL" ? "e-mail" : "WhatsApp"})
            </label>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {reachable.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">Aucun bailleur joignable par ce canal.</p>
              ) : (
                reachable.map((bailleur) => (
                  <label key={bailleur.idBailleur} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
                    <Checkbox
                      checked={selectedIds.includes(bailleur.idBailleur)}
                      onCheckedChange={(checked) =>
                        setSelectedIds(
                          checked === true
                            ? [...selectedIds, bailleur.idBailleur]
                            : selectedIds.filter((id) => id !== bailleur.idBailleur)
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{bailleur.person?.fullName}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {BAILLEUR_PRIORITE_LABELS[bailleur.priorite]}
                    </Badge>
                  </label>
                ))
              )}
            </div>
          </div>

          {channel === "EMAIL" && (
            <div className="space-y-2">
              <Label htmlFor="relance-subject">Objet</Label>
              <Input id="relance-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="relance-message">Message</Label>
            <Textarea id="relance-message" rows={7} value={message} onChange={(e) => setMessage(e.target.value)} />
            <p className="text-xs text-muted-foreground">« {"{nom}"} » est remplacé par le nom de chaque bailleur.</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={isSaving || selectedReachable.length === 0 || !message.trim() || (channel === "EMAIL" && !subject.trim())}
            className="w-full bg-accent-600 text-white hover:bg-accent-600/90 sm:w-auto"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Programmer la relance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RelancesView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = Number(searchParams.get("id")) || null

  const [relances, setRelances] = useState<BailleurRelance[]>([])
  const [bailleurs, setBailleurs] = useState<Bailleur[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [detail, setDetail] = useState<BailleurRelanceDetail | null>(null)
  const [busyMessageId, setBusyMessageId] = useState<number | null>(null)

  const loadList = useCallback(async () => {
    try {
      const [list, allBailleurs] = await Promise.all([getBailleurRelances(), getAllBailleurs().catch(() => [])])
      setRelances(list)
      setBailleurs(allBailleurs)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (id: number) => {
    try {
      setDetail(await getBailleurRelance(id))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
    else setDetail(null)
  }, [selectedId, loadDetail])

  const select = (id: number | null) =>
    router.push(id ? `/dashboard/bailleurs/relances?id=${id}` : "/dashboard/bailleurs/relances")

  const handleMarkSent = async (idMessage: number) => {
    setBusyMessageId(idMessage)
    try {
      await markRelanceMessageSent(idMessage)
      if (selectedId) await loadDetail(selectedId)
      await loadList()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setBusyMessageId(null)
    }
  }

  const handleCancel = async () => {
    if (!detail) return
    try {
      await cancelBailleurRelance(detail.idRelance)
      toast.success("Relance annulée")
      await Promise.all([loadDetail(detail.idRelance), loadList()])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/dashboard/bailleurs" className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Bailleurs
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Relances</h1>
          <p className="text-muted-foreground mt-2">Relances programmées des bailleurs et leur historique</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-accent-600 text-white hover:bg-accent-600/90">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle relance
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className={cn("space-y-3", selectedId && "hidden lg:block")}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : relances.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
              <BellRing className="mb-3 h-12 w-12" />
              Aucune relance programmée.
            </div>
          ) : (
            relances.map((relance) => (
              <Card
                key={relance.idRelance}
                onClick={() => select(relance.idRelance)}
                className={cn(
                  "cursor-pointer border-border transition-colors hover:bg-muted/50",
                  selectedId === relance.idRelance && "border-primary bg-muted/50"
                )}
              >
                <CardContent className="space-y-1 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium">
                      <CalendarClock className="h-4 w-4 text-muted-foreground" />
                      {formatDateTime(relance.scheduledAt)}
                    </span>
                    <Badge variant={relance.statut === "EN_COURS" ? "default" : "secondary"}>
                      {BAILLEUR_RELANCE_STATUT_LABELS[relance.statut]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {relance.channel === "EMAIL" ? "E-mail" : "WhatsApp"} · {relance.recipients} bailleur(s)
                    {relance.counts.A_ENVOYER ? ` · ${relance.counts.A_ENVOYER} à envoyer` : ""}
                  </p>
                  <p className="truncate text-sm">{relance.subject || relance.message}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className={cn(!selectedId && "hidden lg:block")}>
          {!selectedId ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center text-muted-foreground">
                Sélectionnez une relance pour voir ses destinataires.
              </CardContent>
            </Card>
          ) : !detail ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card className="border-border">
              <CardContent className="space-y-5 p-5">
                <Button variant="ghost" size="sm" className="-ml-2 lg:hidden" onClick={() => select(null)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour
                </Button>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Relance {detail.channel === "EMAIL" ? "par e-mail" : "WhatsApp"} du {formatDateTime(detail.scheduledAt)}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {BAILLEUR_RELANCE_STATUT_LABELS[detail.statut]}
                      {detail.creator ? ` · programmée par ${detail.creator.fullName}` : ""}
                    </p>
                  </div>
                  {detail.statut === "PLANIFIEE" && (
                    <Button variant="outline" size="sm" className="text-destructive" onClick={handleCancel}>
                      Annuler la relance
                    </Button>
                  )}
                </div>

                {detail.subject && <p className="font-medium">{detail.subject}</p>}
                <p className="whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm">{detail.message}</p>

                {detail.channel === "WHATSAPP" && detail.messages.some((m) => m.statut === "A_ENVOYER") && (
                  <p className="rounded-md bg-muted px-3 py-2 text-sm">
                    Ouvrez chaque message dans WhatsApp, envoyez-le, puis marquez-le envoyé.
                  </p>
                )}

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Destinataires ({detail.messages.length})</h3>
                  {detail.messages.map((message) => {
                    const person = message.bailleur?.person
                    const link = bailleurWhatsAppLink(person?.phone, message.body || "")
                    return (
                      <div key={message.idBailleurMessage} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/dashboard/bailleurs/${message.idBailleur}`}
                            className="block truncate text-sm font-medium hover:underline"
                          >
                            {person?.fullName}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {detail.channel === "EMAIL" ? person?.email : person?.phone}
                          </p>
                        </div>
                        <Badge variant="secondary">{BAILLEUR_MESSAGE_STATUT_LABELS[message.statut]}</Badge>
                        {detail.channel === "WHATSAPP" && message.statut === "A_ENVOYER" && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled={!link} onClick={() => link && window.open(link, "_blank")}>
                              <MessageCircle className="mr-1 h-4 w-4" />
                              Ouvrir
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleMarkSent(message.idBailleurMessage)}
                              disabled={busyMessageId === message.idBailleurMessage}
                            >
                              {busyMessageId === message.idBailleurMessage ? (
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="mr-1 h-4 w-4" />
                              )}
                              Envoyé
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CreateRelanceDialog
        bailleurs={bailleurs}
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(id) => {
          loadList()
          select(id)
        }}
      />
    </div>
  )
}

// useSearchParams exige une frontière Suspense pour le rendu statique.
export default function RelancesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <RelancesView />
    </Suspense>
  )
}
