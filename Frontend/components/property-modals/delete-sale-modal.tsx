"use client"

import { useState } from "react"
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
import { Loader2 } from "lucide-react"
import { deleteProperty } from "@/actions/properties"
import { PROPERTY_TYPE_LABELS, type Property } from "@/lib/types"
import { toast } from "sonner"

interface DeleteSaleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property: Property | null
  onDelete: (id: number) => void
}

export function DeleteSaleModal({ open, onOpenChange, property, onDelete }: DeleteSaleModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    if (!property) return
    setIsLoading(true)
    try {
      await deleteProperty(property.idProperty)
      onDelete(property.idProperty)
      onOpenChange(false)
      toast.success("Bien supprimé avec succès")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  if (!property) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer ce bien à vendre ?
            <br />
            <br />
            <strong>{PROPERTY_TYPE_LABELS[property.propertyType]}</strong> - {property.quartier}, {property.avenue}
            <br />
            Prix: ${property.price.toLocaleString()}
            <br />
            <br />
            Cette action est irréversible et le bien sera définitivement supprimé de la galerie.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
