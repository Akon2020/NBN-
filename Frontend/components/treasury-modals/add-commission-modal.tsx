"use client"

import type React from "react"

import { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { createCommission } from "@/actions/commissions"
import type { Commission, CommissionBeneficiaireType } from "@/lib/types"
import { toast } from "sonner"

interface AddCommissionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (commission: Commission) => void
}

export function AddCommissionModal({ open, onOpenChange, onAdd }: AddCommissionModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [idClient, setIdClient] = useState("")
  const [beneficiaireType, setBeneficiaireType] = useState<CommissionBeneficiaireType>("AGENCE")
  const [beneficiaireUserId, setBeneficiaireUserId] = useState("")
  const [montantTransaction, setMontantTransaction] = useState("")
  const [currencyCode, setCurrencyCode] = useState("USD")
  const [tauxCommission, setTauxCommission] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const commission = await createCommission({
        idClient: Number(idClient),
        beneficiaireType,
        beneficiaireUserId:
          beneficiaireType === "AGENT" ? Number(beneficiaireUserId) : undefined,
        montantTransaction: Number.parseFloat(montantTransaction),
        currencyCode,
        tauxCommission: tauxCommission ? Number.parseFloat(tauxCommission) : undefined,
      })
      onAdd(commission)
      onOpenChange(false)
      setIdClient("")
      setMontantTransaction("")
      setTauxCommission("")
      setBeneficiaireUserId("")
      toast.success("Commission calculée avec succès")
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
          <DialogTitle>Calculer une commission</DialogTitle>
          <DialogDescription>
            Le client doit avoir une transaction conclue (pipeline CONCLU).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="idClient">ID du client (transaction conclue) *</Label>
            <Input
              id="idClient"
              type="number"
              value={idClient}
              onChange={(e) => setIdClient(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Bénéficiaire</Label>
              <Select
                value={beneficiaireType}
                onValueChange={(v: CommissionBeneficiaireType) => setBeneficiaireType(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGENCE">Agence</SelectItem>
                  <SelectItem value="AGENT">Agent</SelectItem>
                  <SelectItem value="COMMISSIONNAIRE">Commissionnaire (via source du client)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {beneficiaireType === "AGENT" && (
              <div className="space-y-2">
                <Label htmlFor="beneficiaireUserId">ID de l'agent *</Label>
                <Input
                  id="beneficiaireUserId"
                  type="number"
                  value={beneficiaireUserId}
                  onChange={(e) => setBeneficiaireUserId(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="montantTransaction">Montant de la transaction *</Label>
              <Input
                id="montantTransaction"
                type="number"
                min="0.01"
                step="0.01"
                value={montantTransaction}
                onChange={(e) => setMontantTransaction(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Devise *</Label>
              <Select value={currencyCode} onValueChange={setCurrencyCode}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CDF">CDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tauxCommission">Taux de commission (%) *</Label>
            <Input
              id="tauxCommission"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={tauxCommission}
              onChange={(e) => setTauxCommission(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calculer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
