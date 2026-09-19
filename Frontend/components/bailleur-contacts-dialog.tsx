"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Mail, MessageCircle, MessageSquare, Phone, Search } from "lucide-react"
import { BailleurAvatar } from "@/components/bailleur-avatar"
import { logBailleurContact } from "@/actions/bailleurMessages"
import {
  bailleurWhatsAppLink,
  DEFAULT_BAILLEUR_MESSAGE,
  personalize,
  smsLink,
  telLink,
} from "@/lib/bailleurContact"
import type { Bailleur, BailleurContactChannel } from "@/lib/types"
import { cn } from "@/lib/utils"

// « Contacts » : la liste des numéros des bailleurs ; un bailleur choisi,
// on l'appelle, on lui écrit sur WhatsApp ou par SMS, ou par e-mail.
// Chaque action est tracée dans son historique.
export function BailleurContactsDialog({
  bailleurs,
  open,
  onOpenChange,
}: {
  bailleurs: Bailleur[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Bailleur | null>(null)
  const [message, setMessage] = useState(DEFAULT_BAILLEUR_MESSAGE)

  useEffect(() => {
    if (!open) {
      setSearch("")
      setSelected(null)
      setMessage(DEFAULT_BAILLEUR_MESSAGE)
    }
  }, [open])

  const reachable = useMemo(() => {
    const q = search.trim().toLowerCase()
    return bailleurs.filter(
      (b) =>
        (b.person?.phone || b.person?.email) &&
        (!q || (b.person?.fullName || "").toLowerCase().includes(q) || (b.person?.phone || "").includes(q))
    )
  }, [bailleurs, search])

  const personalized = personalize(message, selected?.person?.fullName)

  // Ouvert dans le geste de l'utilisateur, puis trace en arrière-plan.
  const act = (channel: BailleurContactChannel, link: string | null) => {
    if (!selected || !link) return
    window.open(link, channel === "APPEL" || channel === "SMS" ? "_self" : "_blank")
    void logBailleurContact(selected.idBailleur, channel, channel === "APPEL" ? undefined : personalized)
  }

  const phone = selected?.person?.phone
  const email = selected?.person?.email
  const mailto = email
    ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("NBN Express")}&body=${encodeURIComponent(personalized)}`
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Contacts</DialogTitle>
          <DialogDescription>Choisissez un bailleur, puis appelez-le ou écrivez-lui.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Nom ou numéro..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border border-border p-1">
              {reachable.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">Aucun bailleur joignable.</p>
              ) : (
                reachable.map((bailleur) => (
                  <button
                    key={bailleur.idBailleur}
                    type="button"
                    onClick={() => setSelected(bailleur)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded px-2 py-2 text-left hover:bg-muted",
                      selected?.idBailleur === bailleur.idBailleur && "bg-muted"
                    )}
                  >
                    <BailleurAvatar photo={bailleur.photo} fullName={bailleur.person?.fullName} className="h-9 w-9" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{bailleur.person?.fullName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {bailleur.person?.phone || "Pas de numéro"}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            {!selected ? (
              <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                Sélectionnez un bailleur dans la liste.
              </p>
            ) : (
              <>
                <div>
                  <p className="font-semibold">{selected.person?.fullName}</p>
                  <p className="text-sm text-muted-foreground">{phone || "Aucun numéro"}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" disabled={!telLink(phone)} onClick={() => act("APPEL", telLink(phone))}>
                    <Phone className="mr-1 h-4 w-4" />
                    Appeler
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!bailleurWhatsAppLink(phone, "")}
                    onClick={() => act("WHATSAPP", bailleurWhatsAppLink(phone, personalized))}
                  >
                    <MessageCircle className="mr-1 h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button variant="outline" disabled={!smsLink(phone, "")} onClick={() => act("SMS", smsLink(phone, personalized))}>
                    <MessageSquare className="mr-1 h-4 w-4" />
                    SMS
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-bailleur-message">Message (WhatsApp, SMS, e-mail)</Label>
                  <Textarea
                    id="contact-bailleur-message"
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">« {"{nom}"} » est remplacé par le nom du bailleur.</p>
                </div>
                <div className="rounded-md bg-muted/50 p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <Mail className="h-4 w-4" />
                    {email || "Aucune adresse e-mail"}
                  </p>
                  {mailto && (
                    <Button variant="link" className="h-auto px-0" onClick={() => act("EMAIL", mailto)}>
                      Écrire depuis ma messagerie
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
