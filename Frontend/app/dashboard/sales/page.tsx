"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, MapPin, Bed, Bath, HomeIcon, Building, Eye } from "lucide-react"
import type { SaleProperty } from "@/lib/types"
import { mockSales } from "@/lib/mock-data"
import { AddSaleModal } from "@/components/property-modals/add-sale-modal"
import { EditSaleModal } from "@/components/property-modals/edit-sale-modal"
import { DeleteSaleModal } from "@/components/property-modals/delete-sale-modal"
import Image from "next/image"
import Link from "next/link"

export default function SalesPage() {
  const [properties, setProperties] = useState<SaleProperty[]>(mockSales)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<SaleProperty | null>(null)

  const handleAdd = (property: SaleProperty) => {
    setProperties([property, ...properties])
  }

  const handleEdit = (updatedProperty: SaleProperty) => {
    setProperties(properties.map((p) => (p.id === updatedProperty.id ? updatedProperty : p)))
  }

  const handleDelete = (id: string) => {
    setProperties(properties.filter((p) => p.id !== id))
    setShowDeleteModal(false)
  }

  const openEditModal = (property: SaleProperty) => {
    setSelectedProperty(property)
    setShowEditModal(true)
  }

  const openDeleteModal = (property: SaleProperty) => {
    setSelectedProperty(property)
    setShowDeleteModal(true)
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      durable: "Construction durable",
      "semi-durable": "Semi-durable",
      "flat-land": "Terrain plat",
      "slope-land": "Terrain en pente",
    }
    return labels[type] || type
  }

  const isLand = (type: string) => type === "flat-land" || type === "slope-land"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Biens à vendre</h1>
          <p className="text-muted-foreground mt-2">Gérez les maisons et terrains disponibles à la vente</p>
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
              <Badge className="absolute top-2 right-2 bg-secondary text-secondary-foreground">
                {getTypeLabel(property.type)}
              </Badge>
              {property.score && (
                <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
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

              {!isLand(property.type) && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    {property.floors} ét.
                  </div>
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
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <div className="text-2xl font-bold text-secondary">${property.price.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Marge: ${property.margin.toLocaleString()}</div>
                </div>
                <div className="flex gap-1">
                  <Link href={`/dashboard/sales/${property.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(property)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => openDeleteModal(property)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AddSaleModal open={showAddModal} onOpenChange={setShowAddModal} onAdd={handleAdd} />
      <EditSaleModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        property={selectedProperty}
        onEdit={handleEdit}
      />
      <DeleteSaleModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        property={selectedProperty}
        onDelete={handleDelete}
      />
    </div>
  )
}
