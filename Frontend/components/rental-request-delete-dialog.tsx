"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Loader2 } from "lucide-react"
import { deleteRentalRequest } from "@/actions/rentalRequests"
import type { RentalRequest } from "@/lib/types"
import { toast } from "sonner"

// Aligné sur le minimum exigé par le Backend.
const MIN_REASON_LENGTH = 10

export function RentalRequestDeleteDialog({
  request,
  open,
  onOpenChange,
  onDeleted,
}: {
  request: RentalRequest
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (idRentalRequest: number) => void
}) {
  const [reason, setReason] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const remaining = MIN_REASON_LENGTH - reason.trim().length

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteRentalRequest(request.idRentalRequest, reason.trim())
      toast.success("Fiche supprimée — elle reste dans le rapport des demandes")
      setReason("")
      onDeleted(request.idRentalRequest)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setReason("")
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Supprimer la fiche</DialogTitle>
          <DialogDescription>
            La demande de {request.fullName} disparaîtra de la liste. Elle restera consultable dans
            Rapports → Demandes de location, avec votre commentaire. Le client reste sur le pipeline.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="deletion-reason">
            Commentaire <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="deletion-reason"
            rows={4}
            placeholder="Ex. Doublon d'une demande déjà traitée, client injoignable depuis 3 semaines…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {remaining > 0 ? `Encore ${remaining} caractère(s) minimum.` : "Commentaire suffisant."}
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || remaining > 0}>
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Supprimer la fiche
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
