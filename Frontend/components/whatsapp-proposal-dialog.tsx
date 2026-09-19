"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Check, Copy, Loader2, MessageCircle, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { sendProposals } from "@/actions/proposals"
import type { CompanyInfo } from "@/actions/appSettings"
import { whatsAppNumberOf } from "@/lib/clientContact"
import { getImageUrl } from "@/lib/imageUrl"
import { PROPERTY_TYPE_LABELS, type Property, type ProposalTarget } from "@/lib/types"
import {
  buildPropertyCaption,
  canShareFiles,
  DEFAULT_COMPANY,
  formatPropertyPrice,
  getCompanyInfo,
  loadPropertyPhoto,
  shareWithPhoto,
  whatsAppShareUrl,
} from "@/lib/whatsappProposal"

// Envoi WhatsApp bien par bien : un message par bien, avec sa photo quand
// l'appareil sait la joindre (partage natif du téléphone). Les propositions
// d'un client sont enregistrées une seule fois, à la fin, pour les seuls
// biens réellement envoyés.
export function WhatsAppProposalDialog({
  open,
  onOpenChange,
  properties,
  target,
  onFinished,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  properties: Property[]
  target?: ProposalTarget | null
  onFinished?: (sentIds: number[]) => void
}) {
  const [company, setCompany] = useState<CompanyInfo>(DEFAULT_COMPANY)
  // Clé absente = photo en préparation ; null = pas de photo disponible.
  const [photos, setPhotos] = useState<Record<number, File | null>>({})
  const [sentIds, setSentIds] = useState<number[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const clientNumber = whatsAppNumberOf(target?.phone)
  const propertyKey = properties.map((p) => p.idProperty).join(",")
  const filesSupported = typeof navigator !== "undefined" && typeof navigator.canShare === "function"

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setSentIds([])
    setPhotos({})
    getCompanyInfo().then((info) => {
      if (!cancelled) setCompany(info)
    })
    // Photos téléchargées dès l'ouverture : le partage doit partir dans le
    // geste de l'utilisateur, sans attente réseau au moment du clic.
    properties.forEach((property) => {
      loadPropertyPhoto(property).then((file) => {
        if (!cancelled) setPhotos((prev) => ({ ...prev, [property.idProperty]: file }))
      })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, propertyKey])

  const markSent = (idProperty: number) =>
    setSentIds((prev) => (prev.includes(idProperty) ? prev : [...prev, idProperty]))

  const captionFor = (property: Property, index: number, includePhotoLink: boolean) =>
    buildPropertyCaption(property, company, {
      position: index + 1,
      total: properties.length,
      greetingName: index === 0 ? target?.fullName : null,
      includePhotoLink,
    })

  const sendWithPhoto = async (property: Property, index: number, file: File) => {
    const result = await shareWithPhoto(file, captionFor(property, index, false))
    if (result === "shared") markSent(property.idProperty)
    if (result === "failed") toast.error("Le partage a échoué : utilisez l'envoi du texte.")
  }

  const sendText = (property: Property, index: number) => {
    const hasPhoto = Boolean(photos[property.idProperty])
    window.open(whatsAppShareUrl(captionFor(property, index, hasPhoto || Boolean(property.images?.length)), clientNumber), "_blank")
    markSent(property.idProperty)
  }

  const copyText = async (property: Property, index: number) => {
    try {
      await navigator.clipboard.writeText(captionFor(property, index, false))
      toast.success("Message copié : collez-le en légende de la photo")
    } catch {
      toast.error("Copie impossible sur cet appareil")
    }
  }

  const finish = async () => {
    if (target && sentIds.length > 0) {
      setIsSaving(true)
      try {
        const result = await sendProposals({ idClient: target.idClient, idProperties: sentIds, channel: "WHATSAPP" })
        toast.success(`${result.created} bien(s) proposé(s) à ${target.fullName} — ${result.total} proposition(s) au total`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur inconnue")
        setIsSaving(false)
        return
      }
      setIsSaving(false)
    }
    onFinished?.(sentIds)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{target ? `Proposer à ${target.fullName}` : "Partager sur WhatsApp"}</DialogTitle>
          <DialogDescription>
            Un message par bien, avec sa photo.{" "}
            {filesSupported
              ? `« Envoyer avec la photo » ouvre le partage du téléphone : choisissez WhatsApp puis ${target ? target.fullName : "le contact"}.`
              : "Ce navigateur ne peut pas joindre de photo à WhatsApp : le message contient le lien de la photo. Pour envoyer les photos elles-mêmes, ouvrez le tableau de bord sur téléphone."}
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex-1 space-y-3 overflow-y-auto px-1">
          {properties.map((property, index) => {
            const loaded = property.idProperty in photos
            const photo = photos[property.idProperty]
            const sent = sentIds.includes(property.idProperty)
            return (
              <div key={property.idProperty} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image src={getImageUrl(property.images?.[0]?.image)} alt="" fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {index + 1}. {PROPERTY_TYPE_LABELS[property.propertyType]}
                      {property.quartier ? ` — ${property.quartier}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatPropertyPrice(property)}</p>
                  </div>
                  {sent && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success-500">
                      <Check className="h-4 w-4" />
                      Envoyé
                    </span>
                  )}
                </div>

                <p className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">
                  {captionFor(property, index, false)}
                </p>

                <div className="flex flex-wrap gap-2">
                  {filesSupported && !loaded && property.images?.length ? (
                    <Button size="sm" disabled className="gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Préparation de la photo
                    </Button>
                  ) : null}
                  {photo && canShareFiles([photo]) && (
                    <Button
                      size="sm"
                      className="gap-2 bg-secondary-600 text-white hover:bg-secondary-600/90"
                      onClick={() => sendWithPhoto(property, index, photo)}
                    >
                      <Send className="h-4 w-4" />
                      Envoyer avec la photo
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => sendText(property, index)}>
                    <MessageCircle className="h-4 w-4" />
                    {clientNumber ? "Texte seul au client" : "Texte seul"}
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-2" onClick={() => copyText(property, index)}>
                    <Copy className="h-4 w-4" />
                    Copier
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {sentIds.length}/{properties.length} envoyé(s)
          </p>
          <Button onClick={finish} disabled={isSaving} className="gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {target && sentIds.length > 0 ? "Terminer et enregistrer" : "Terminer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
