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
import { createRequisition } from "@/actions/requisitions"
import { getAllCaisses } from "@/actions/treasury"
import type { Caisse, Requisition } from "@/lib/types"
import { toast } from "sonner"

interface AddRequisitionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (requisition: Requisition) => void
}

export function AddRequisitionModal({ open, onOpenChange, onAdd }: AddRequisitionModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [caisses, setCaisses] = useState<Caisse[]>([])
  const [idCaisse, setIdCaisse] = useState("")
  const [currencyCode, setCurrencyCode] = useState("")
  const [nature, setNature] = useState("")
  const [quantite, setQuantite] = useState("")
  const [coutEstime, setCoutEstime] = useState("")
  const [justificatif, setJustificatif] = useState("")

  useEffect(() => {
    if (!open) return
    getAllCaisses()
      .then((data) => {
        setCaisses(data.filter((c) => c.statut === "OUVERTE"))
      })
      .catch(() => toast.error("Erreur lors du chargement des caisses"))
  }, [open])

  const selectedCaisse = caisses.find((c) => String(c.idCaisse) === idCaisse)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idCaisse || !currencyCode) return

    setIsLoading(true)
    try {
      const requisition = await createRequisition({
        idCaisse: Number(idCaisse),
        nature,
        quantite: quantite ? Number.parseInt(quantite, 10) : undefined,
        coutEstime: Number.parseFloat(coutEstime),
        currencyCode,
        justificatif: justificatif || undefined,
      })
      onAdd(requisition)
      onOpenChange(false)
      setNature("")
      setQuantite("")
      setCoutEstime("")
      setJustificatif("")
      toast.success("Réquisition soumise avec succès")
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
          <DialogTitle>Soumettre une réquisition de fonds</DialogTitle>
          <DialogDescription>
            Saisie → Vérification automatique → Approbation par la trésorerie.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Caisse cible *</Label>
            <Select
              value={idCaisse}
              onValueChange={(v) => {
                setIdCaisse(v)
                setCurrencyCode("")
              }}
            >
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

          <div className="space-y-2">
            <Label htmlFor="nature">Nature du besoin *</Label>
            <Input
              id="nature"
              value={nature}
              onChange={(e) => setNature(e.target.value)}
              placeholder="Achat de fournitures de bureau"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="quantite">Quantité</Label>
              <Input
                id="quantite"
                type="number"
                min="1"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coutEstime">Coût estimé *</Label>
              <Input
                id="coutEstime"
                type="number"
                min="0.01"
                step="0.01"
                value={coutEstime}
                onChange={(e) => setCoutEstime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Devise *</Label>
              <Select value={currencyCode} onValueChange={setCurrencyCode}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCaisse?.balances?.map((b) => (
                    <SelectItem key={b.currencyCode} value={b.currencyCode}>
                      {b.currencyCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="justificatif">Justificatif</Label>
            <Textarea
              id="justificatif"
              rows={3}
              value={justificatif}
              onChange={(e) => setJustificatif(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !idCaisse || !currencyCode || !nature || !coutEstime}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Soumettre"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
