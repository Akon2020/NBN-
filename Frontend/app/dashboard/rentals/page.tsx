"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  MapPin,
  Bed,
  Bath,
  HomeIcon,
  Eye,
  Loader2,
} from "lucide-react";
import {
  PROPERTY_STATUT_BADGE_CLASS,
  PROPERTY_STATUT_LABELS,
  PROPERTY_TYPE_LABELS,
  RENTAL_UNIT_LABELS,
  type Property,
} from "@/lib/types";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { getImageUrl } from "@/lib/imageUrl";
import { getAllProperties } from "@/actions/properties";
import { AddRentalModal } from "@/components/property-modals/add-rental-modal";
import { EditRentalModal } from "@/components/property-modals/edit-rental-modal";
import { DeleteRentalModal } from "@/components/property-modals/delete-rental-modal";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

export default function RentalsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await getAllProperties();
        setProperties(all.filter((p) => p.category === "RENT"));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur inconnue");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleAdd = (property: Property) => {
    setProperties([property, ...properties]);
  };

  const handleEdit = (updatedProperty: Property) => {
    setProperties(
      properties.map((p) => (p.idProperty === updatedProperty.idProperty ? updatedProperty : p))
    );
  };

  const handleDelete = (id: number) => {
    setProperties(properties.filter((p) => p.idProperty !== id));
    setShowDeleteModal(false);
  };

  const openEditModal = (property: Property) => {
    setSelectedProperty(property);
    setShowEditModal(true);
  };

  const openDeleteModal = (property: Property) => {
    setSelectedProperty(property);
    setShowDeleteModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">
            Biens à louer
          </h1>
          <p className="text-muted-foreground mt-2">
            Gérez les appartements et maisons disponibles à la location
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto bg-primary text-primary-foreground"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un bien
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <HomeIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucun bien à louer</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ajoutez votre premier bien à louer pour commencer
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Card
              key={property.idProperty}
              className="border-border overflow-hidden group"
            >
              <Link href={`/dashboard/rentals/${property.idProperty}`}>
                <div className="relative aspect-video overflow-hidden">
                  <Image
                    src={getImageUrl(property.images?.[0]?.image)}
                    alt={`${PROPERTY_TYPE_LABELS[property.propertyType]} à ${property.quartier || ""}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                    {PROPERTY_TYPE_LABELS[property.propertyType]}
                  </Badge>
                  <Badge className={`absolute top-2 left-2 ${PROPERTY_STATUT_BADGE_CLASS[property.statut]}`}>
                    {PROPERTY_STATUT_LABELS[property.statut]}
                  </Badge>
                  <div className="absolute bottom-2 right-2">
                    <AddToCartButton property={property} />
                  </div>
                </div>
              </Link>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {property.avenue}
                  </h3>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    {property.quartier}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Bed className="h-4 w-4" />
                    {property.bedrooms ?? 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    {property.toilets ?? 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <HomeIcon className="h-4 w-4" />
                    {property.livingRooms ?? 0}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      ${property.price}
                    </div>
                    {property.rentalDetails && (
                      <div className="text-xs text-muted-foreground">
                        Garantie: {property.rentalDetails.guarantee ?? 0}{" "}
                        {RENTAL_UNIT_LABELS[property.rentalDetails.unit]}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Link href={`/dashboard/rentals/${property.idProperty}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditModal(property)}
                    >
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
      )}

      <AddRentalModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAdd={handleAdd}
      />
      <EditRentalModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        property={selectedProperty}
        onEdit={handleEdit}
      />
      <DeleteRentalModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        property={selectedProperty}
        onDelete={handleDelete}
      />
    </div>
  );
}
