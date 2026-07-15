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
import { markCommissionDue } from "@/actions/commissions"
import { getAllCaisses } from "@/actions/treasury"
import type { Caisse, Commission } from "@/lib/types"
import { toast } from "sonner"

interface MarkCommissionDueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commission: Commission | null
  onUpdated: (commission: Commission) => void
}

export function MarkCommissionDueModal({
  open,
  onOpenChange,
  commission,
  onUpdated,
}: MarkCommissionDueModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [caisses, setCaisses] = useState<Caisse[]>([])
  const [idCaisse, setIdCaisse] = useState("")

  useEffect(() => {
    if (!open || !commission) return
    getAllCaisses()
      .then((data) =>
        setCaisses(
          data.filter(
            (c) =>
              c.statut === "OUVERTE" &&
              c.balances?.some((b) => b.currencyCode === commission.currencyCode)
          )
        )
      )
      .catch(() => toast.error("Erreur lors du chargement des caisses"))
  }, [open, commission])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commission || !idCaisse) return

    setIsLoading(true)
    try {
      const updated = await markCommissionDue(commission.idCommission, Number(idCaisse))
      onUpdated(updated)
      onOpenChange(false)
      toast.success("Commission marquée due")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  if (!commission) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marquer la commission due</DialogTitle>
          <DialogDescription>
            Choisissez la caisse qui décaissera cette commission (
            {Number(commission.montantCommission).toLocaleString("fr-FR")}{" "}
            {commission.currencyCode}).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Caisse</Label>
            <Select value={idCaisse} onValueChange={setIdCaisse}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner une caisse" />
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
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !idCaisse}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
