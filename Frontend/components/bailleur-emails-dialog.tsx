"use client"

import { useEffect, useMemo, useState } from "react"
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
import { ArrowLeft, Loader2, Search, Send } from "lucide-react"
import { sendBailleurEmails } from "@/actions/bailleurMessages"
import { DEFAULT_BAILLEUR_MESSAGE } from "@/lib/bailleurContact"
import {
  BAILLEUR_PRIORITE_LABELS,
  BAILLEUR_PRIORITES,
  type Bailleur,
  type BailleurPriorite,
} from "@/lib/types"
import { toast } from "sonner"

// « Emails » : on sélectionne des bailleurs, puis on rédige l'objet et le
// message ; l'envoi part depuis contact@nbnexpress.org, un e-mail par
// bailleur, personnalisé avec « {nom} ».
export function BailleurEmailsDialog({
  bailleurs,
  open,
  onOpenChange,
}: {
  bailleurs: Bailleur[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [step, setStep] = useState<"selection" | "message">("selection")
  const [search, setSearch] = useState("")
  const [priorite, setPriorite] = useState<BailleurPriorite | "">("")
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState(DEFAULT_BAILLEUR_MESSAGE)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (!open) {
      setStep("selection")
      setSearch("")
      setPriorite("")
      setSelectedIds([])
      setSubject("")
      setMessage(DEFAULT_BAILLEUR_MESSAGE)
    }
  }, [open])

  const withEmail = useMemo(() => bailleurs.filter((b) => b.person?.email), [bailleurs])
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return withEmail.filter(
      (b) =>
        (!priorite || b.priorite === priorite) &&
        (!q || (b.person?.fullName || "").toLowerCase().includes(q) || (b.person?.email || "").includes(q))
    )
  }, [withEmail, search, priorite])

  const allVisibleSelected = visible.length > 0 && visible.every((b) => selectedIds.includes(b.idBailleur))
  const toggleAllVisible = () =>
    setSelectedIds(
      allVisibleSelected
        ? selectedIds.filter((id) => !visible.some((b) => b.idBailleur === id))
        : [...new Set([...selectedIds, ...visible.map((b) => b.idBailleur)])]
    )

  const handleSend = async () => {
    setIsSending(true)
    try {
      const result = await sendBailleurEmails({ idBailleurs: selectedIds, subject: subject.trim(), message: message.trim() })
      toast.success(`${result.sent} e-mail(s) envoyé(s) depuis contact@nbnexpress.org`)
      if (result.withoutEmail.length) toast.warning(`Sans adresse e-mail : ${result.withoutEmail.join(", ")}`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Emails aux bailleurs</DialogTitle>
          <DialogDescription>
            {step === "selection"
              ? `Étape 1 sur 2 — Destinataires (${withEmail.length} bailleurs ont une adresse e-mail)`
              : "Étape 2 sur 2 — Message, envoyé depuis contact@nbnexpress.org"}
          </DialogDescription>
        </DialogHeader>

        {step === "selection" ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Nom ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-2">
              {BAILLEUR_PRIORITES.map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={priorite === value ? "default" : "outline"}
                  onClick={() => setPriorite(priorite === value ? "" : value)}
                >
                  {BAILLEUR_PRIORITE_LABELS[value]}
                </Button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 px-2 text-sm font-medium">
              <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAllVisible} />
              Tout sélectionner ({visible.length})
            </label>
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {visible.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">Aucun bailleur avec e-mail.</p>
              ) : (
                visible.map((bailleur) => (
                  <label
                    key={bailleur.idBailleur}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                  >
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
                    <span className="min-w-0 text-sm">
                      <span className="block truncate">{bailleur.person?.fullName}</span>
                      <span className="block truncate text-xs text-muted-foreground">{bailleur.person?.email}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
            <DialogFooter>
              <Button
                disabled={selectedIds.length === 0}
                onClick={() => setStep("message")}
                className="w-full bg-accent-600 text-white hover:bg-accent-600/90 sm:w-auto"
              >
                Suivant ({selectedIds.length})
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              De : <strong>contact@nbnexpress.org</strong> · À : {selectedIds.length} bailleur(s)
            </p>
            <div className="space-y-2">
              <Label htmlFor="bailleur-email-subject">Objet</Label>
              <Input id="bailleur-email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bailleur-email-message">Message</Label>
              <Textarea id="bailleur-email-message" rows={9} value={message} onChange={(e) => setMessage(e.target.value)} />
              <p className="text-xs text-muted-foreground">« {"{nom}"} » est remplacé par le nom de chaque bailleur.</p>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setStep("selection")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending || !subject.trim() || !message.trim()}
                className="bg-accent-600 text-white hover:bg-accent-600/90"
              >
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Envoyer
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
