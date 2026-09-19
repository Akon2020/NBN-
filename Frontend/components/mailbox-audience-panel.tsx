"use client"

import { useEffect, useState } from "react"
import { Loader2, RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { getMailboxAudiences, resetMailboxAudience, updateMailboxAudience } from "@/actions/inboundEmails"
import { ASSIGNABLE_ROLES, ROLE_LABELS, type MailboxAudience } from "@/lib/types"

interface Draft {
  roles: string[]
  users: string
}

const draftOf = (mailbox: MailboxAudience): Draft => ({ roles: mailbox.roles, users: mailbox.users.join(", ") })

const parseEmails = (raw: string) => [
  ...new Set(
    raw
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  ),
]

// Qui reçoit les notifications et lit les messages de chaque boîte
// professionnelle. Le Backend ne renvoie que les boîtes dont l'utilisateur
// est membre, et seuls ces membres peuvent en changer l'audience.
export function MailboxAudiencePanel() {
  const [mailboxes, setMailboxes] = useState<MailboxAudience[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const replace = (updated: MailboxAudience) => {
    setMailboxes((prev) => prev.map((mailbox) => (mailbox.key === updated.key ? updated : mailbox)))
    setDrafts((prev) => ({ ...prev, [updated.key]: draftOf(updated) }))
  }

  useEffect(() => {
    getMailboxAudiences()
      .then((list) => {
        setMailboxes(list)
        setDrafts(Object.fromEntries(list.map((mailbox) => [mailbox.key, draftOf(mailbox)])))
      })
      .catch(() => {
        // Sans boîte accessible (ou hors ligne), le panneau reste masqué.
      })
  }, [])

  if (mailboxes.length === 0) return null

  const toggleRole = (key: string, role: string, checked: boolean) =>
    setDrafts((prev) => {
      const draft = prev[key]
      const roles = checked ? [...draft.roles, role] : draft.roles.filter((r) => r !== role)
      return { ...prev, [key]: { ...draft, roles } }
    })

  const run = async (key: string, action: () => Promise<MailboxAudience>, success: string) => {
    setBusyKey(key)
    try {
      replace(await action())
      toast.success(success)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Boîtes mail professionnelles</CardTitle>
        <CardDescription>
          Qui reçoit la notification et peut lire et répondre aux messages de chaque boîte. Seuls les membres
          d&apos;une boîte en règlent l&apos;audience.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {mailboxes.map((mailbox, index) => {
          const draft = drafts[mailbox.key]
          const roleOptions = [...new Set<string>([...ASSIGNABLE_ROLES, ...mailbox.roles])]
          const busy = busyKey === mailbox.key
          return (
            <div key={mailbox.key} className="space-y-4">
              {index > 0 && <Separator />}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium break-all">{mailbox.address}</p>
                <Badge variant="outline">
                  {mailbox.source === "settings" ? "Modifiée dans Paramètres" : "Réglage du serveur"}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label>Rôles destinataires</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {roleOptions.map((role) => {
                    const id = `audience-${mailbox.key}-${role}`
                    return (
                      <div key={role} className="flex items-center gap-2">
                        <Checkbox
                          id={id}
                          checked={draft.roles.includes(role)}
                          onCheckedChange={(checked) => toggleRole(mailbox.key, role, checked === true)}
                        />
                        <Label htmlFor={id} className="font-normal">
                          {ROLE_LABELS[role] ?? role}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`audience-${mailbox.key}-users`}>Comptes en plus (adresses e-mail)</Label>
                <Textarea
                  id={`audience-${mailbox.key}-users`}
                  rows={2}
                  placeholder="prenom.nom@nbnexpress.org, autre@nbnexpress.org"
                  value={draft.users}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [mailbox.key]: { ...draft, users: e.target.value } }))}
                />
                <p className="text-sm text-muted-foreground">
                  Le compte dont l&apos;adresse est {mailbox.address} y a toujours accès.
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {mailbox.source === "settings" && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => run(mailbox.key, () => resetMailboxAudience(mailbox.key), "Réglage du serveur rétabli")}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Rétablir le réglage du serveur
                  </Button>
                )}
                <Button
                  disabled={busy}
                  onClick={() =>
                    run(
                      mailbox.key,
                      () => updateMailboxAudience(mailbox.key, { roles: draft.roles, users: parseEmails(draft.users) }),
                      "Audience enregistrée"
                    )
                  }
                >
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Enregistrer l&apos;audience
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
