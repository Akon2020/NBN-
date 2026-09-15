"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
import { Loader2, Search, X } from "lucide-react"
import { getUsersDirectory, type UserDirectoryEntry } from "@/actions/users"
import { getAllCommissionnaires } from "@/actions/commissionnaires"
import { assignRentalRequest } from "@/actions/rentalRequests"
import { isEmailFormatValid } from "@/lib/contactValidation"
import { ROLE_LABELS, type Commissionnaire, type RentalRequest } from "@/lib/types"
import { toast } from "sonner"

// « Assigner une tâche » depuis une demande reçue : on choisit des
// utilisateurs, des commissionnaires (collecteurs/courtiers) et, pour
// quelqu'un qui n'a pas encore de compte, une adresse e-mail. Le Backend
// crée la tâche et envoie la fiche PDF à chacun.
export function RentalRequestAssignDialog({
  request,
  open,
  onOpenChange,
}: {
  request: RentalRequest
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [users, setUsers] = useState<UserDirectoryEntry[] | null>(null)
  // null = liste non accessible (rôle sans commissionnaires:read)
  const [commissionnaires, setCommissionnaires] = useState<Commissionnaire[] | null>(null)
  const [search, setSearch] = useState("")
  const [userIds, setUserIds] = useState<number[]>([])
  const [commissionnaireIds, setCommissionnaireIds] = useState<number[]>([])
  const [emails, setEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState("")
  const [dateEcheance, setDateEcheance] = useState("")
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ idTask: number; emailsQueued: number; withoutEmail: string[] } | null>(null)

  useEffect(() => {
    if (!open) return
    setResult(null)
    getUsersDirectory()
      .then(setUsers)
      .catch(() => setUsers([]))
    getAllCommissionnaires()
      .then(setCommissionnaires)
      .catch(() => setCommissionnaires(null))
  }, [open])

  const q = search.trim().toLowerCase()
  const filteredUsers = useMemo(
    () => (users ?? []).filter((user) => !q || user.fullName.toLowerCase().includes(q)),
    [users, q]
  )
  const filteredCommissionnaires = useMemo(
    () =>
      (commissionnaires ?? []).filter(
        (c) => !q || (c.person?.fullName || "").toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
      ),
    [commissionnaires, q]
  )

  const toggle = (list: number[], id: number, checked: boolean) =>
    checked ? [...list, id] : list.filter((item) => item !== id)

  // Une adresse s'ajoute avec Entrée, une virgule ou à la sortie du champ.
  const addEmail = () => {
    const value = emailInput.trim().replace(/,$/, "").toLowerCase()
    if (!value) return
    if (!isEmailFormatValid(value)) {
      toast.error(`Adresse e-mail invalide : ${value}`)
      return
    }
    if (!emails.includes(value)) setEmails([...emails, value])
    setEmailInput("")
  }

  const recipientCount = userIds.length + commissionnaireIds.length + emails.length

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const data = await assignRentalRequest(request.idRentalRequest, {
        assigneeUserIds: userIds,
        idCommissionnaires: commissionnaireIds,
        extraEmails: emails,
        dateEcheance: dateEcheance || undefined,
        note: note.trim() || undefined,
      })
      setResult(data)
      toast.success(`Tâche créée — fiche envoyée à ${data.emailsQueued} destinataire(s)`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const reset = (nextOpen: boolean) => {
    if (!nextOpen) {
      setUserIds([])
      setCommissionnaireIds([])
      setEmails([])
      setEmailInput("")
      setDateEcheance("")
      setNote("")
      setSearch("")
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assigner une tâche</DialogTitle>
          <DialogDescription>
            Demande de {request.fullName}. La fiche PDF sera envoyée par e-mail à chaque personne choisie.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 py-2 text-sm">
            <p>
              Tâche créée. Fiche envoyée à <strong>{result.emailsQueued}</strong> destinataire(s).
            </p>
            {result.withoutEmail.length > 0 && (
              <p className="rounded-md bg-warning-500/15 px-3 py-2">
                Sans adresse e-mail, la fiche n&apos;a pas pu leur être envoyée : {result.withoutEmail.join(", ")}.
              </p>
            )}
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/tasks/${result.idTask}`}>Voir la tâche</Link>
              </Button>
              <Button onClick={() => reset(false)}>Fermer</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un nom ou un code CCM..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-2">
              <Label>Utilisateurs de l&apos;agence</Label>
              {users === null ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {filteredUsers.length === 0 && <p className="px-2 py-1 text-sm text-muted-foreground">Aucun résultat</p>}
                  {filteredUsers.map((user) => (
                    <label
                      key={user.idUser}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={userIds.includes(user.idUser)}
                        onCheckedChange={(checked) => setUserIds(toggle(userIds, user.idUser, checked === true))}
                      />
                      <span className="text-sm">
                        {user.fullName}
                        <span className="ml-1 text-xs text-muted-foreground">({ROLE_LABELS[user.role] || user.role})</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {commissionnaires !== null && (
              <div className="space-y-2">
                <Label>Commissionnaires (collecteurs, courtiers)</Label>
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {filteredCommissionnaires.length === 0 && (
                    <p className="px-2 py-1 text-sm text-muted-foreground">Aucun résultat</p>
                  )}
                  {filteredCommissionnaires.map((c) => (
                    <label
                      key={c.idCommissionnaire}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={commissionnaireIds.includes(c.idCommissionnaire)}
                        onCheckedChange={(checked) =>
                          setCommissionnaireIds(toggle(commissionnaireIds, c.idCommissionnaire, checked === true))
                        }
                      />
                      <span className="text-sm">
                        {c.person?.fullName || "Sans nom"}
                        <span className="ml-1 font-mono text-xs text-muted-foreground">{c.code}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="assign-email">Autre destinataire (sans compte)</Label>
              <Input
                id="assign-email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="adresse@exemple.com puis Entrée"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault()
                    addEmail()
                  }
                }}
                onBlur={addEmail}
              />
              {emails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {emails.map((email) => (
                    <span key={email} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
                      {email}
                      <button
                        type="button"
                        aria-label={`Retirer ${email}`}
                        onClick={() => setEmails(emails.filter((item) => item !== email))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assign-due">Échéance</Label>
                <Input id="assign-due" type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assign-note">Consigne</Label>
              <Textarea
                id="assign-note"
                rows={3}
                placeholder="Ex. Appeler la cliente et proposer 3 biens à Ibanda avant vendredi."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || recipientCount === 0}
                className="w-full bg-accent-600 text-white hover:bg-accent-600/90 sm:w-auto"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assigner et envoyer la fiche{recipientCount > 0 ? ` (${recipientCount})` : ""}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
