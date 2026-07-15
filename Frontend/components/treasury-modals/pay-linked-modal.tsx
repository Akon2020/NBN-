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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { getPaymentMethods, recordPayment } from "@/actions/payments"
import type { Payment, PaymentMethod, PaymentType } from "@/lib/types"
import { toast } from "sonner"

interface PayLinkedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  type: PaymentType
  amount: number
  currencyCode: string
  idCaisse: number
  idRequisition?: number
  idCommission?: number
  onPaid: (payment: Payment) => void
}

export function PayLinkedModal({
  open,
  onOpenChange,
  title,
  type,
  amount,
  currencyCode,
  idCaisse,
  idRequisition,
  idCommission,
  onPaid,
}: PayLinkedModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [idPaymentMethod, setIdPaymentMethod] = useState("")

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
        amount,
        currencyCode,
        idCaisse,
        idPaymentMethod: Number(idPaymentMethod),
        idRequisition,
        idCommission,
      })
      onPaid(payment)
      onOpenChange(false)
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {amount.toLocaleString("fr-FR")} {currencyCode} — génère un CashMovement et une
            LedgerEntry.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !idPaymentMethod}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Payer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
