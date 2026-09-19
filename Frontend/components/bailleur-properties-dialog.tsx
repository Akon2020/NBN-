"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Home, Loader2 } from "lucide-react"
import { getBailleurProperties } from "@/actions/bailleurs"
import { getImageUrl } from "@/lib/imageUrl"
import {
  PROPERTY_STATUT_LABELS,
  PROPERTY_TYPE_LABELS,
  type Bailleur,
  type Property,
} from "@/lib/types"
import { toast } from "sonner"

// « Aperçu » : tous les biens à l'actif d'un bailleur.
export function BailleurPropertiesDialog({
  bailleur,
  open,
  onOpenChange,
}: {
  bailleur: Bailleur | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open || !bailleur) return
    setIsLoading(true)
    getBailleurProperties(bailleur.idBailleur)
      .then(setProperties)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Erreur inconnue"))
      .finally(() => setIsLoading(false))
  }, [open, bailleur])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Biens de {bailleur?.person?.fullName}</DialogTitle>
          <DialogDescription>
            {isLoading ? "Chargement…" : `${properties.length} bien(s) à son actif`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center text-muted-foreground">
            <Home className="mb-2 h-8 w-8" />
            Aucun bien enregistré pour ce bailleur.
          </div>
        ) : (
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            {properties.map((property) => (
              <Link
                key={property.idProperty}
                href={`/dashboard/${property.category === "SALE" ? "sales" : "rentals"}/${property.idProperty}`}
                className="flex gap-3 rounded-lg border border-border p-2 transition-colors hover:bg-muted"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image src={getImageUrl(property.images?.[0]?.image)} alt="" fill sizes="80px" className="object-cover" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium">
                    {PROPERTY_TYPE_LABELS[property.propertyType]} {property.category === "SALE" ? "à vendre" : "à louer"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[property.avenue, property.quartier].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-sm font-semibold">
                    ${Number(property.price).toLocaleString("fr-FR")}
                    {property.category === "RENT" ? "/mois" : ""}
                  </p>
                  <Badge variant="secondary" className="text-[10px]">
                    {PROPERTY_STATUT_LABELS[property.statut]}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
