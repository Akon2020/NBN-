"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { RentalProperty } from "@/lib/types"

interface DeleteRentalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property: RentalProperty | null
  onDelete: (id: string) => void
}

export function DeleteRentalModal({ open, onOpenChange, property, onDelete }: DeleteRentalModalProps) {
  const handleDelete = () => {
    if (property) {
      onDelete(property.id)
      onOpenChange(false)
    }
  }

  if (!property) return null

  const propertyLabel = property.type === "apartment" ? "Appartement" : "Maison"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer ce bien à louer ?
            <br />
            <br />
            <strong>{propertyLabel}</strong> - {property.address.neighborhood}, {property.address.avenue}
            <br />
            Prix: ${property.price}/mois
            <br />
            <br />
            Cette action est irréversible et le bien sera définitivement supprimé de la galerie.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
