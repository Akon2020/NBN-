"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Mail, MessageCircle } from "lucide-react"
import { updateClient } from "@/actions/clients"
import { getAuthUser } from "@/lib/auth"
import {
  clientContactMessage,
  clientContactSubject,
  mailtoLink,
  whatsAppLink,
} from "@/lib/clientContact"
import type { Client } from "@/lib/types"
import { cn } from "@/lib/utils"

type Channel = "WHATSAPP" | "EMAIL"

// « Contacter » : WhatsApp ou e-mail, message pré-rempli et modifiable ici,
// puis encore modifiable dans l'application qui s'ouvre. Le dernier contact
// est tracé sur la fiche.
export function ClientContactDialog({
  client,
  open,
  onOpenChange,
  onContacted,
}: {
  client: Client
  open: boolean
  onOpenChange: (open: boolean) => void
  onContacted?: (client: Client) => void
}) {
  const phone = client.person?.phone
  const email = client.person?.email
  const [channel, setChannel] = useState<Channel>(phone ? "WHATSAPP" : "EMAIL")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!open) return
    setChannel(phone ? "WHATSAPP" : "EMAIL")
    setSubject(clientContactSubject(client.dossierNumber))
    setMessage(
      clientContactMessage({
        fullName: client.person?.fullName,
        dossierNumber: client.dossierNumber,
        agentName: getAuthUser()?.fullName,
      })
    )
  }, [open, phone, client.dossierNumber, client.person?.fullName])

  const link = channel === "WHATSAPP" ? whatsAppLink(phone, message) : mailtoLink(email, subject, message)

  const handleOpen = () => {
    if (!link) return
    // Ouvert immédiatement, dans le geste de l'utilisateur (sinon bloqué
    // comme pop-up, surtout sur iPhone).
    window.open(link, "_blank")
    onOpenChange(false)
    // Traçabilité non bloquante : un rôle sans clients:manage contacte quand même.
    updateClient(client.idClient, { dernierContact: new Date().toISOString() })
      .then((updated) => onContacted?.(updated))
      .catch(() => {})
  }

  const channelButton = (value: Channel, label: string, Icon: typeof Mail, available: boolean) => (
    <button
      type="button"
      disabled={!available}
      onClick={() => setChannel(value)}
      aria-pressed={channel === value}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm transition-colors",
        channel === value ? "border-primary-900 bg-primary-900 text-white" : "border-border hover:bg-muted",
        !available && "cursor-not-allowed opacity-50"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contacter {client.person?.fullName}</DialogTitle>
          <DialogDescription>Modifiez le message si besoin, puis ouvrez l&apos;application.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            {channelButton("WHATSAPP", phone ? `WhatsApp · ${phone}` : "WhatsApp (pas de numéro)", MessageCircle, Boolean(whatsAppLink(phone, "")))}
            {channelButton("EMAIL", email ? "E-mail" : "E-mail (pas d'adresse)", Mail, Boolean(email))}
          </div>

          {channel === "EMAIL" && (
            <div className="space-y-2">
              <Label htmlFor="contact-subject">Objet</Label>
              <Input id="contact-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <p className="text-xs text-muted-foreground">À : {email}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="contact-message">Message</Label>
            <Textarea id="contact-message" rows={9} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleOpen}
            disabled={!link || !message.trim()}
            className="w-full bg-accent-600 text-white hover:bg-accent-600/90 sm:w-auto"
          >
            {channel === "WHATSAPP" ? "Ouvrir WhatsApp" : "Ouvrir la messagerie"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
