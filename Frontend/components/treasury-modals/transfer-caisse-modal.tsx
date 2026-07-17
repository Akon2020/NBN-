"use client"

import type React from "react"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { createCaisseTransfer } from "@/actions/treasury"
import type { Caisse, CaisseTransfer } from "@/lib/types"
import { toast } from "sonner"

interface TransferCaisseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caisses: Caisse[]
  sourceCaisseId?: number
  onTransferred: (transfer: CaisseTransfer) => void
}

// GOAL 10 — virement entre deux caisses, dans une seule devise, jamais de
// conversion implicite (CLAUDE.md §4). Le Backend reste seul autorité sur
// la validation (caisse clôturée, solde insuffisant) ; ce formulaire ne
// fait que proposer les devises réellement communes aux deux caisses.
export function TransferCaisseModal({
  open,
  onOpenChange,
  caisses,
  sourceCaisseId,
  onTransferred,
}: TransferCaisseModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [idCaisseSource, setIdCaisseSource] = useState<string>(
    sourceCaisseId ? String(sourceCaisseId) : ""
  )
  const [idCaisseDestination, setIdCaisseDestination] = useState<string>("")
  const [currencyCode, setCurrencyCode] = useState<string>("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (!open) return
    setIdCaisseSource(sourceCaisseId ? String(sourceCaisseId) : "")
    setIdCaisseDestination("")
    setCurrencyCode("")
    setAmount("")
    setDescription("")
  }, [open, sourceCaisseId])

  const sourceCaisse = caisses.find((c) => c.idCaisse === Number(idCaisseSource))
  const destinationOptions = caisses.filter((c) => c.idCaisse !== Number(idCaisseSource))
  const availableCurrencies = sourceCaisse?.balances?.map((b) => b.currencyCode) || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idCaisseSource || !idCaisseDestination || !currencyCode || !amount) return

    setIsLoading(true)
    try {
      const transfer = await createCaisseTransfer({
        idCaisseSource: Number(idCaisseSource),
        idCaisseDestination: Number(idCaisseDestination),
        currencyCode,
        amount: Number.parseFloat(amount),
        description: description || undefined,
      })
      onTransferred(transfer)
      onOpenChange(false)
      toast.success("Virement effectué avec succès")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Virement entre caisses</DialogTitle>
          <DialogDescription>
            Transfère un montant d&apos;une caisse vers une autre, dans une seule devise.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Caisse source</Label>
            <Select
              value={idCaisseSource}
              onValueChange={(v) => {
                setIdCaisseSource(v)
                setCurrencyCode("")
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionnez la caisse source" />
              </SelectTrigger>
              <SelectContent>
                {caisses.map((c) => (
                  <SelectItem key={c.idCaisse} value={String(c.idCaisse)}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Caisse destination</Label>
            <Select value={idCaisseDestination} onValueChange={setIdCaisseDestination}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionnez la caisse destination" />
              </SelectTrigger>
              <SelectContent>
                {destinationOptions.map((c) => (
                  <SelectItem key={c.idCaisse} value={String(c.idCaisse)}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Devise</Label>
              <Select value={currencyCode} onValueChange={setCurrencyCode} disabled={!sourceCaisse}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Devise" />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-amount">Montant *</Label>
              <Input
                id="transfer-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-description">Description</Label>
            <Textarea
              id="transfer-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !idCaisseSource || !idCaisseDestination || !currencyCode || !amount}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Effectuer le virement"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
