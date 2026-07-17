"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Banknote,
  Home,
  Loader2,
  MessageSquareWarning,
  Plus,
  Send,
} from "lucide-react"
import { toast } from "sonner"
import {
  CLIENT_COMPLAINT_STATUT_LABELS,
  COMMISSION_STATUT_LABELS,
  PROPERTY_STATUT_BADGE_CLASS,
  PROPERTY_STATUT_LABELS,
  PROPERTY_TYPE_LABELS,
  type ClientDossier as ClientDossierData,
} from "@/lib/types"
import { createComplaint, getClientDossier, resolveComplaint } from "@/actions/clients"

interface ClientDossierProps {
  idClient: number
}

const propertyLabel = (property?: {
  propertyType?: string
  quartier?: string | null
  avenue?: string | null
}) => {
  if (!property) return "Bien inconnu"
  const typeLabel = property.propertyType
    ? PROPERTY_TYPE_LABELS[property.propertyType as keyof typeof PROPERTY_TYPE_LABELS]
    : ""
  const location = [property.avenue, property.quartier].filter(Boolean).join(", ")
  return [typeLabel, location].filter(Boolean).join(" — ") || `Bien`
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR")

// GOAL 8 — vue 360 : référence centrale d'un client (biens occupés,
// propositions envoyées, commissions/paiements liés, plaintes). La
// timeline reste un composant séparé et réutilisé (EntityTimeline),
// jamais dupliquée ici.
export function ClientDossier({ idClient }: ClientDossierProps) {
  const [dossier, setDossier] = useState<ClientDossierData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [resolvingId, setResolvingId] = useState<number | null>(null)
  const [resolution, setResolution] = useState("")

  const load = async () => {
    setIsLoading(true)
    try {
      setDossier(await getClientDossier(idClient))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idClient])

  const handleAddComplaint = async () => {
    if (!subject.trim()) {
      toast.error("Le sujet est requis.")
      return
    }
    setSubmitting(true)
    try {
      await createComplaint(idClient, {
        subject: subject.trim(),
        description: description.trim() || undefined,
      })
      toast.success("Plainte enregistrée avec succès")
      setAddOpen(false)
      setSubject("")
      setDescription("")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSubmitting(false)
    }
  }

  const handleResolve = async () => {
    if (resolvingId === null) return
    setSubmitting(true)
    try {
      await resolveComplaint(idClient, resolvingId, resolution.trim() || undefined)
      toast.success("Plainte résolue avec succès")
      setResolvingId(null)
      setResolution("")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!dossier) return null

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Biens occupés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dossier.occupiedProperties.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun bien occupé actuellement.</p>
          ) : (
            dossier.occupiedProperties.map((m) => (
              <Link
                key={m.idMatching}
                href={
                  m.property?.category === "SALE"
                    ? `/dashboard/sales/${m.idProperty}`
                    : `/dashboard/rentals/${m.idProperty}`
                }
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium">{propertyLabel(m.property)}</span>
                {m.property && (
                  <Badge className={PROPERTY_STATUT_BADGE_CLASS[m.property.statut]}>
                    {PROPERTY_STATUT_LABELS[m.property.statut]}
                  </Badge>
                )}
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Propositions envoyées
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dossier.proposals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune proposition envoyée.</p>
          ) : (
            dossier.proposals.map((p) => (
              <div key={p.idProposal} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{propertyLabel(p.property)}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(p.sentAt)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Commissions &amp; paiements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dossier.commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune commission liée.</p>
          ) : (
            dossier.commissions.map((c) => (
              <div key={c.idCommission} className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {propertyLabel(c.property || undefined)}
                  </span>
                  <Badge variant="secondary">{COMMISSION_STATUT_LABELS[c.statut]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {Number(c.montantCommission).toLocaleString("fr-FR")} {c.currencyCode}
                </p>
                {c.payment && (
                  <p className="text-xs text-muted-foreground">
                    Payé : {Number(c.payment.amount).toLocaleString("fr-FR")}{" "}
                    {c.payment.currencyCode} le {formatDate(c.payment.createdAt)}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <MessageSquareWarning className="h-5 w-5" />
            Plaintes
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {dossier.complaints.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune plainte enregistrée.</p>
          ) : (
            dossier.complaints.map((c) => (
              <div key={c.idClientComplaint} className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium">{c.subject}</span>
                  <Badge
                    className={
                      c.statut === "RESOLUE"
                        ? "bg-success-500 text-white"
                        : "bg-error-500 text-white"
                    }
                  >
                    {CLIENT_COMPLAINT_STATUT_LABELS[c.statut]}
                  </Badge>
                </div>
                {c.description && (
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                )}
                {c.statut === "RESOLUE" ? (
                  c.resolution && (
                    <p className="text-xs text-muted-foreground">Résolution : {c.resolution}</p>
                  )
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1"
                    onClick={() => {
                      setResolvingId(c.idClientComplaint)
                      setResolution("")
                    }}
                  >
                    Marquer résolue
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer une plainte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Sujet</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Fuite d'eau..." />
            </div>
            <div className="space-y-2">
              <Label>Description (optionnelle)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détails utiles pour le suivi..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddComplaint} disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resolvingId !== null} onOpenChange={(open) => !open && setResolvingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Résoudre la plainte</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Résolution (optionnelle)</Label>
            <Textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Comment la plainte a été traitée..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolvingId(null)}>
              Annuler
            </Button>
            <Button onClick={handleResolve} disabled={submitting}>
              {submitting ? "Résolution..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
