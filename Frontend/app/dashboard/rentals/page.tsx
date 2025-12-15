"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, MapPin, Bed, Bath, HomeIcon } from "lucide-react"
import type { RentalProperty } from "@/lib/types"
import { mockRentals } from "@/lib/mock-data"
import { AddRentalModal } from "@/components/property-modals/add-rental-modal"
import Image from "next/image"

export default function RentalsPage() {
  const [properties, setProperties] = useState<RentalProperty[]>(mockRentals)
  const [showAddModal, setShowAddModal] = useState(false)

  const handleAdd = (property: RentalProperty) => {
    setProperties([property, ...properties])
  }

  const handleDelete = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce bien ?")) {
      setProperties(properties.filter((p) => p.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Biens à louer</h1>
          <p className="text-muted-foreground mt-2">Gérez les appartements et maisons disponibles à la location</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un bien
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <Card key={property.id} className="border-border overflow-hidden group">
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={property.images[0] || "/placeholder.svg"}
                alt={`${property.type} à ${property.address.neighborhood}`}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
              <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                {property.type === "apartment" ? "Appartement" : "Maison"}
              </Badge>
              {property.score && (
                <Badge className="absolute top-2 left-2 bg-secondary text-secondary-foreground">
                  Score: {property.score}
                </Badge>
              )}
            </div>
            <CardContent className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-lg line-clamp-1">{property.address.avenue}</h3>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  {property.address.neighborhood}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Bed className="h-4 w-4" />
                  {property.bedrooms}
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="h-4 w-4" />
                  {property.bathrooms}
                </div>
                <div className="flex items-center gap-1">
                  <HomeIcon className="h-4 w-4" />
                  {property.livingRooms}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <div className="text-2xl font-bold text-primary">${property.price}</div>
                  <div className="text-xs text-muted-foreground">
                    Garantie: {property.guarantee.value}{" "}
                    {property.guarantee.unit === "months"
                      ? "mois"
                      : property.guarantee.unit === "years"
                        ? "ans"
                        : "jours"}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(property.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AddRentalModal open={showAddModal} onOpenChange={setShowAddModal} onAdd={handleAdd} />
    </div>
  )
}
