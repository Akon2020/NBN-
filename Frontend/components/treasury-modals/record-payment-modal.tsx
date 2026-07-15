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
import { getPaymentMethods, recordPayment } from "@/actions/payments"
import type { Caisse, Payment, PaymentMethod, PaymentType } from "@/lib/types"
import { toast } from "sonner"

interface RecordPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caisse: Caisse
  onRecorded: (payment: Payment) => void
}

export function RecordPaymentModal({
  open,
  onOpenChange,
  caisse,
  onRecorded,
}: RecordPaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [type, setType] = useState<PaymentType>("ENCAISSEMENT")
  const [amount, setAmount] = useState("")
  const [currencyCode, setCurrencyCode] = useState(caisse.balances?.[0]?.currencyCode || "USD")
  const [idPaymentMethod, setIdPaymentMethod] = useState<string>("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (!open) return
    getPaymentMethods()
      .then((data) => {
        setMethods(data)
        if (data.length) setIdPaymentMethod(String(data[0].idPaymentMethod))
      })
      .catch(() => toast.error("Erreur lors du chargement des moyens de paiement"))
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idPaymentMethod) return

    setIsLoading(true)
    try {
      const payment = await recordPayment({
        type,
        amount: Number.parseFloat(amount),
        currencyCode,
        idCaisse: caisse.idCaisse,
        idPaymentMethod: Number(idPaymentMethod),
        description: description || undefined,
      })
      onRecorded(payment)
      onOpenChange(false)
      setAmount("")
      setDescription("")
      toast.success("Paiement enregistré avec succès")
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
          <DialogTitle>Enregistrer un paiement</DialogTitle>
          <DialogDescription>
            Génère un mouvement de caisse et une écriture de ledger append-only.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v: PaymentType) => setType(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENCAISSEMENT">Encaissement</SelectItem>
                  <SelectItem value="DECAISSEMENT">Décaissement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Devise</Label>
              <Select value={currencyCode} onValueChange={setCurrencyCode}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {caisse.balances?.map((b) => (
                    <SelectItem key={b.currencyCode} value={b.currencyCode}>
                      {b.currencyCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Montant *</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Moyen de paiement</Label>
            <Select value={idPaymentMethod} onValueChange={setIdPaymentMethod}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {methods.map((m) => (
                  <SelectItem key={m.idPaymentMethod} value={String(m.idPaymentMethod)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !amount || !idPaymentMethod}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
