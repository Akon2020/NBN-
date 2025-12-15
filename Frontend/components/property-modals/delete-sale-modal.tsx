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
import type { SaleProperty } from "@/lib/types"

interface DeleteSaleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property: SaleProperty | null
  onDelete: (id: string) => void
}

export function DeleteSaleModal({ open, onOpenChange, property, onDelete }: DeleteSaleModalProps) {
  const handleDelete = () => {
    if (property) {
      onDelete(property.id)
      onOpenChange(false)
    }
  }

  if (!property) return null

  const propertyTypeLabels = {
    durable: "Maison durable",
    "semi-durable": "Maison semi-durable",
    "flat-land": "Terrain plat",
    "slope-land": "Terrain en pente",
  }

  const propertyLabel = propertyTypeLabels[property.type]

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer ce bien à vendre ?
            <br />
            <br />
            <strong>{propertyLabel}</strong> - {property.address.neighborhood}, {property.address.avenue}
            <br />
            Prix: ${property.price.toLocaleString()}
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
