"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, CheckCircle2, Circle, Inbox, Info, Loader2, Mail, MailOpen, Reply, Search, Send } from "lucide-react"
import {
  getInboundEmail,
  getInboundEmails,
  getMyMailboxes,
  markInboundEmailRead,
  replyToInboundEmail,
} from "@/actions/inboundEmails"
import { getAuthUser } from "@/lib/auth"
import { openCompose, replySubject } from "@/lib/gmail"
import type { InboundEmail, InboundEmailDetail, Mailbox } from "@/lib/types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const formatDate = (value: string) =>
  new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })

const senderOf = (email: InboundEmail) => email.fromName || email.fromAddress || "Expéditeur inconnu"

// Brouillon de réponse : l'agent n'a plus qu'à écrire le cœur du message.
const replyTemplate = (email: InboundEmail) => {
  const signature = getAuthUser()?.fullName
  return `Bonjour ${email.fromName || ""},\n\n\n\nCordialement,\n${signature ? `${signature}\n` : ""}NBN Express`
}

// « Répondre » : nouveau message Gmail adressé à l'expéditeur, objet
// « Re: ... », ouvert sur le compte de la boîte qui a reçu le message.
const replyInGmail = (email: InboundEmail, body: string, prefer: "gmail" | "mailto" = "gmail") =>
  openCompose(
    { to: email.fromAddress, subject: replySubject(email.subject), body, account: email.mailboxAddress || undefined },
    prefer
  )

function MessagesView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = Number(searchParams.get("id")) || null

  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [emails, setEmails] = useState<InboundEmail[]>([])
  const [mailboxFilter, setMailboxFilter] = useState("")
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [detail, setDetail] = useState<InboundEmailDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [reply, setReply] = useState("")
  const [isSending, setIsSending] = useState(false)

  const loadList = useCallback(async () => {
    try {
      const [boxes, messages] = await Promise.all([getMyMailboxes(), getInboundEmails()])
      setMailboxes(boxes)
      setEmails(messages)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    setIsLoadingDetail(true)
    getInboundEmail(selectedId)
      .then((email) => {
        setDetail(email)
        setReply(replyTemplate(email))
        // Ouvrir un message le marque lu pour soi (le Backend le note aussi).
        setEmails((list) => list.map((e) => (e.idInboundEmail === email.idInboundEmail ? { ...e, isRead: true } : e)))
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Erreur inconnue"))
      .finally(() => setIsLoadingDetail(false))
  }, [selectedId])

  const [unreadOnly, setUnreadOnly] = useState(false)
  const unreadCount = emails.filter((email) => !email.isRead).length

  const toggleRead = async (email: InboundEmail) => {
    const next = !email.isRead
    setEmails((list) => list.map((e) => (e.idInboundEmail === email.idInboundEmail ? { ...e, isRead: next } : e)))
    try {
      await markInboundEmailRead(email.idInboundEmail, next)
    } catch (error) {
      setEmails((list) => list.map((e) => (e.idInboundEmail === email.idInboundEmail ? { ...e, isRead: !next } : e)))
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return emails.filter(
      (email) =>
        (!unreadOnly || !email.isRead) &&
        (!mailboxFilter || email.mailboxKey === mailboxFilter) &&
        (!q ||
          (email.subject || "").toLowerCase().includes(q) ||
          senderOf(email).toLowerCase().includes(q))
    )
  }, [emails, mailboxFilter, search, unreadOnly])

  const select = (id: number | null) => router.push(id ? `/dashboard/messages?id=${id}` : "/dashboard/messages")

  const handleSend = async () => {
    if (!detail) return
    setIsSending(true)
    try {
      await replyToInboundEmail(detail.idInboundEmail, reply)
      toast.success(`Réponse envoyée depuis ${detail.mailboxAddress}`)
      const [refreshed] = await Promise.all([getInboundEmail(detail.idInboundEmail), loadList()])
      setDetail(refreshed)
      setReply(replyTemplate(refreshed))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (mailboxes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Aucune boîte professionnelle</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Aucune boîte (contact@, direction@, etc.) n&apos;est attribuée à votre compte.
        </p>
      </div>
    )
  }

  const filterLabel = mailboxFilter
    ? mailboxes.find((m) => m.key === mailboxFilter)?.address
    : mailboxes.map((m) => m.address).join(", ")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Messages reçus</h1>
        <p className="text-muted-foreground mt-2">
          {mailboxes.map((mailbox) => mailbox.address).join(", ")}
          {unreadCount > 0 && `, ${unreadCount} non lu${unreadCount > 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-muted-foreground">
          Cette page affiche les e-mails reçus sur les adresses professionnelles de l&apos;agence auxquelles votre compte a
          accès. Ils sont relevés automatiquement toutes les deux minutes et restent aussi dans la boîte mail habituelle.
          Ouvrez un message pour le lire, puis « Répondre dans Gmail » : la réponse part du compte de la boîte concernée.
          Un message ouvert est marqué lu pour vous seul.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Liste - masquée sur téléphone quand un message est ouvert */}
        <div className={cn("space-y-3", selectedId && "hidden lg:block")}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un expéditeur ou un objet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={unreadOnly ? "default" : "outline"} onClick={() => setUnreadOnly((v) => !v)}>
              Non lus{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </Button>
          </div>
          {mailboxes.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {[{ key: "", address: "Toutes" }, ...mailboxes].map((mailbox) => (
                <Button
                  key={mailbox.key || "all"}
                  size="sm"
                  variant={mailboxFilter === mailbox.key ? "default" : "outline"}
                  onClick={() => setMailboxFilter(mailbox.key)}
                >
                  {mailbox.address}
                </Button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {emails.length === 0
                  ? `Aucun message reçu sur ${filterLabel} pour le moment.`
                  : unreadOnly
                    ? "Aucun message non lu."
                    : `Aucun message ne correspond sur ${filterLabel}.`}
              </p>
            </div>
          ) : (
            filtered.map((email) => (
              <Card
                key={email.idInboundEmail}
                onClick={() => select(email.idInboundEmail)}
                className={cn(
                  "cursor-pointer border-border transition-colors hover:bg-muted/50",
                  selectedId === email.idInboundEmail && "border-primary bg-muted/50"
                )}
              >
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("flex min-w-0 items-center gap-2 truncate", email.isRead ? "font-medium" : "font-bold")}>
                      {!email.isRead && <Circle className="h-2.5 w-2.5 shrink-0 fill-accent-500 text-accent-500" aria-label="Non lu" />}
                      <span className="truncate">{senderOf(email)}</span>
                    </span>
                    {email.repliedAt ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary-600" aria-label="Répondu" />
                    ) : (
                      <Badge variant="outline" className="shrink-0">À traiter</Badge>
                    )}
                  </div>
                  <p className="text-sm truncate">{email.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(email.receivedAt)}, {email.mailboxAddress}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Détail et réponse */}
        <div className={cn(!selectedId && "hidden lg:block")}>
          {!selectedId ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <Mail className="h-10 w-10 mb-3" />
                Sélectionnez un message pour le lire et y répondre.
              </CardContent>
            </Card>
          ) : isLoadingDetail || !detail ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card className="border-border">
              <CardContent className="p-5 space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <Button variant="ghost" size="sm" className="lg:hidden -ml-2" onClick={() => select(null)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour aux messages
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => {
                      const current = emails.find((e) => e.idInboundEmail === detail.idInboundEmail)
                      if (current) void toggleRead(current)
                    }}
                  >
                    <MailOpen className="mr-2 h-4 w-4" />
                    {emails.find((e) => e.idInboundEmail === detail.idInboundEmail)?.isRead ? "Marquer non lu" : "Marquer lu"}
                  </Button>
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-semibold break-words">{detail.subject}</h2>
                  <p className="text-sm">
                    <span className="font-medium">{senderOf(detail)}</span>
                    {detail.fromName && detail.fromAddress && (
                      <span className="text-muted-foreground"> &lt;{detail.fromAddress}&gt;</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reçu le {formatDate(detail.receivedAt)} sur {detail.mailboxAddress}
                  </p>
                </div>

                <div className="whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-4 text-sm leading-relaxed">
                  {detail.textBody || "(message vide)"}
                </div>

                {detail.replies.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Réponses envoyées</h3>
                    {detail.replies.map((item) => (
                      <div
                        key={item.idInboundEmailReply}
                        className={cn(
                          "rounded-lg border p-3 text-sm",
                          item.statut === "FAILED" ? "border-destructive/40" : "border-border"
                        )}
                      >
                        <p className="text-xs text-muted-foreground mb-1">
                          {item.author?.fullName || "Membre de l'équipe"}, {formatDate(item.createdAt)}
                          {item.statut === "FAILED" && ", échec d'envoi"}
                        </p>
                        <p className="whitespace-pre-wrap break-words">{item.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                {detail.fromAddress && (
                  <div className="space-y-3 border-t border-border pt-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Reply className="h-4 w-4" />
                      Répondre à {detail.fromAddress}
                    </h3>
                    <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={8} />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => replyInGmail(detail, reply, "gmail")}
                        disabled={!reply.trim()}
                        className="bg-accent-600 text-white hover:bg-accent-600/90"
                      >
                        <Reply className="mr-2 h-4 w-4" />
                        Répondre dans Gmail
                      </Button>
                      {detail.canReply && (
                        <Button variant="outline" onClick={handleSend} disabled={isSending || !reply.trim()}>
                          {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Envoyer depuis le site
                        </Button>
                      )}
                      <Button variant="ghost" onClick={() => replyInGmail(detail, reply, "mailto")} disabled={!reply.trim()}>
                        <Mail className="mr-2 h-4 w-4" />
                        Autre messagerie
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Gmail s&apos;ouvre sur le compte {detail.mailboxAddress} s&apos;il est connecté dans ce navigateur.
                      {detail.canReply && " « Envoyer depuis le site » garde la réponse dans l'historique ci-dessus."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// useSearchParams exige une frontière Suspense pour le rendu statique.
export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MessagesView />
    </Suspense>
  )
}
