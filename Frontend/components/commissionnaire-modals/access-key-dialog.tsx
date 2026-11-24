"use client"

import { useState } from "react"
import { Check, Copy, KeyRound, Loader2, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sendCommissionnaireAccessKey, type AccessKeyResult } from "@/actions/fieldAgent"
import type { Commissionnaire } from "@/lib/types"
import { toast } from "sonner"

// Clé d'accès d'un commissionnaire (P1.2) : le compte est créé s'il n'existe
// pas, la clé part par e-mail et peut être transmise sur WhatsApp. Une
// nouvelle clé remplace la précédente.
export function AccessKeyDialog({
  commissionnaire,
  open,
  onOpenChange,
}: {
  commissionnaire: Commissionnaire
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const person = commissionnaire.person
  const hasAccount = Boolean(person?.idUser)
  const [email, setEmail] = useState(person?.email ?? "")
  const [sendEmail, setSendEmail] = useState(true)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<AccessKeyResult | null>(null)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setBusy(true)
    try {
      const { message, data } = await sendCommissionnaireAccessKey(commissionnaire.idCommissionnaire, {
        email: hasAccount ? undefined : email.trim() || undefined,
        sendEmail,
      })
      setResult(data)
      toast.success(message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(`${result.accessKey}\n${result.link}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Copie impossible sur cet appareil")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) setResult(null)
        onOpenChange(value)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" aria-hidden />
            Clé d&apos;accès
          </DialogTitle>
          <DialogDescription>
            {person?.fullName} ({commissionnaire.code}) se connecte une première fois avec cette clé, puis choisit son mot
            de passe. Valable 72 heures, usage unique.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted p-4 text-center">
              <p className="font-mono text-2xl font-bold tracking-[0.2em]">{result.accessKey}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Compte : {result.email} · expire le {new Date(result.expiresAt).toLocaleString("fr-FR")}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {result.whatsappLink && (
                <Button asChild className="flex-1 bg-success-500 text-white hover:bg-success-500/90">
                  <a href={result.whatsappLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Envoyer sur WhatsApp
                  </a>
                </Button>
              )}
              <Button variant="outline" className="flex-1" onClick={copy}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? "Copié" : "Copier la clé et le lien"}
              </Button>
            </div>
            {result.emailQueued && <p className="text-sm text-muted-foreground">Un e-mail avec la clé est parti à {result.email}.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {!hasAccount && (
              <div className="space-y-2">
                <Label htmlFor="access-email">Adresse e-mail de connexion</Label>
                <Input
                  id="access-email"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom@gmail.com"
                />
                <p className="text-xs text-muted-foreground">Son compte sera créé avec cette adresse.</p>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={sendEmail} onCheckedChange={(value) => setSendEmail(value === true)} />
              Envoyer aussi la clé par e-mail
            </label>
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)}>Fermer</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={generate} disabled={busy || (!hasAccount && !email.trim())}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Générer la clé
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
