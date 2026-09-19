"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Inbox, Loader2, MessagesSquare } from "lucide-react"
import { getBailleurMessages } from "@/actions/bailleurMessages"
import {
  BAILLEUR_CONTACT_CHANNEL_LABELS,
  BAILLEUR_MESSAGE_STATUT_LABELS,
  type BailleurMessageHistory,
} from "@/lib/types"

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString("fr-FR") : "")

// Historique des échanges d'un bailleur : ce que l'agence lui a envoyé
// (e-mails, appels, WhatsApp, SMS, relances) et ses messages reçus sur les
// boîtes professionnelles auxquelles l'utilisateur a accès.
export function BailleurMessagesHistory({ idBailleur, refreshKey }: { idBailleur: number; refreshKey?: string }) {
  const [history, setHistory] = useState<BailleurMessageHistory | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    getBailleurMessages(idBailleur)
      .then(setHistory)
      .catch(() => setHistory({ sent: [], received: [] }))
      .finally(() => setIsLoading(false))
  }, [idBailleur, refreshKey])

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessagesSquare className="h-5 w-5" />
          Historique des échanges
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !history ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Envoyés ({history.sent.length})</h4>
              {history.sent.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun échange enregistré.</p>
              ) : (
                history.sent.map((message) => (
                  <div key={message.idBailleurMessage} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{BAILLEUR_CONTACT_CHANNEL_LABELS[message.channel]}</Badge>
                      {message.statut !== "ENVOYE" && (
                        <Badge variant="secondary">{BAILLEUR_MESSAGE_STATUT_LABELS[message.statut]}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(message.sentAt || message.createdAt)}
                        {message.sender ? ` · ${message.sender.fullName}` : ""}
                      </span>
                    </div>
                    {message.subject && <p className="mt-1 font-medium">{message.subject}</p>}
                    {message.body && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-muted-foreground">{message.body}</p>}
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <Inbox className="h-4 w-4" />
                Reçus ({history.received.length})
              </h4>
              {history.received.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun e-mail reçu de ce bailleur.</p>
              ) : (
                history.received.map((email) => (
                  <Link
                    key={email.idInboundEmail}
                    href={`/dashboard/messages?id=${email.idInboundEmail}`}
                    className="block rounded-lg border border-border p-3 text-sm hover:bg-muted"
                  >
                    <p className="font-medium">{email.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(email.receivedAt)} · {email.mailboxAddress}
                      {email.repliedAt ? " · répondu" : ""}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
