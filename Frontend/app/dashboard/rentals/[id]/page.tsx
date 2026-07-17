"use client"

import { useState, useEffect, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  MapPin,
  Bed,
  Bath,
  HomeIcon,
  Phone,
  DollarSign,
  Calendar,
  Edit,
  Trash2,
  Heart,
  Share2,
  Loader2,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { EditRentalModal } from "@/components/property-modals/edit-rental-modal"
import { DeleteRentalModal } from "@/components/property-modals/delete-rental-modal"
import { PropertyStatutControl } from "@/components/property-statut-control"
import { PropertyMediaManager } from "@/components/property-media-manager"
import { EntityTimeline } from "@/components/entity-timeline"
import { getSingleProperty } from "@/actions/properties"
import { addFavorite, getMyFavorites, removeFavorite } from "@/actions/favorites"
import { PROPERTY_TYPE_LABELS, RENTAL_UNIT_LABELS, type Property } from "@/lib/types"
import { getImageUrl } from "@/lib/imageUrl"
import { toast } from "sonner"

export default function RentalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [property, setProperty] = useState<Property | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const [propertyData, favorites] = await Promise.all([
          getSingleProperty(Number(id)),
          getMyFavorites().catch(() => []),
        ])
        setProperty(propertyData)
        setIsFavorite(favorites.some((f) => f.idProperty === Number(id)))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur inconnue")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Bien non trouvé</h2>
        <p className="text-muted-foreground mb-6">Ce bien à louer n'existe pas ou a été supprimé</p>
        <Link href="/dashboard/rentals">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux biens à louer
          </Button>
        </Link>
      </div>
    )
  }

  const handleEdit = (updatedProperty: Property) => {
    setProperty(updatedProperty)
  }

  const handleDelete = () => {
    router.push("/dashboard/rentals")
  }

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await removeFavorite(property.idProperty)
        setIsFavorite(false)
      } else {
        await addFavorite(property.idProperty)
        setIsFavorite(true)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  const handleWhatsAppProposal = () => {
    const guarantee = property.rentalDetails
      ? `${property.rentalDetails.guarantee ?? 0} ${RENTAL_UNIT_LABELS[property.rentalDetails.unit].toLowerCase()}`
      : "N/A"
    const message = `Bonjour! Je vous propose ce bien à louer:\n\n${PROPERTY_TYPE_LABELS[property.propertyType]}\nAdresse: ${property.avenue}, ${property.quartier}, Bukavu\n${property.bedrooms ?? 0} chambres, ${property.livingRooms ?? 0} salons, ${property.toilets ?? 0} douches, ${property.kitchens ?? 0} cuisines\nPrix: $${property.price}/mois\nGarantie: ${guarantee}\n\nPour plus d'informations, contactez-nous!`

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const images = property.images || []
  const phones = property.phones || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dashboard/rentals">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={toggleFavorite}>
            <Heart className={`h-4 w-4 mr-2 ${isFavorite ? "fill-current text-red-500" : ""}`} />
            {isFavorite ? "Retiré des favoris" : "Ajouter aux favoris"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleWhatsAppProposal}>
            <Share2 className="h-4 w-4 mr-2" />
            Proposer via WhatsApp
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive bg-transparent"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border overflow-hidden">
            <div className="relative aspect-video bg-muted">
              {images.length > 0 ? (
                <Image
                  src={getImageUrl(images[currentImageIndex]?.image)}
                  alt={`Image ${currentImageIndex + 1} du bien`}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Aucune image disponible</p>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="p-4 flex gap-2 overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={image.idPropertyImage}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 ${
                      currentImageIndex === index ? "border-primary" : "border-border"
                    }`}
                  >
                    <Image
                      src={getImageUrl(image.image)}
                      alt={`Miniature ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="border-border">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl text-balance">{property.avenue}</CardTitle>
                  <div className="flex items-center text-muted-foreground mt-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    {property.quartier}, Bukavu, Sud-Kivu, RDC
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className="bg-primary text-primary-foreground">
                    {PROPERTY_TYPE_LABELS[property.propertyType]}
                  </Badge>
                  <PropertyStatutControl property={property} onChanged={setProperty} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <Bed className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Chambres</p>
                    <p className="text-lg font-semibold">{property.bedrooms ?? 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <HomeIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Salons</p>
                    <p className="text-lg font-semibold">{property.livingRooms ?? 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <Bath className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Douches</p>
                    <p className="text-lg font-semibold">{property.toilets ?? 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <HomeIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Cuisines</p>
                    <p className="text-lg font-semibold">{property.kitchens ?? 0}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Étage</h3>
                <p className="text-muted-foreground">
                  {!property.floors ? "Rez-de-chaussée" : `${property.floors}e étage`}
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{property.description || "Aucune description disponible"}</p>
              </div>

              {property.latitude && property.longitude && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Localisation GPS</h3>
                    <p className="text-muted-foreground">
                      Latitude: {property.latitude}, Longitude: {property.longitude}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Prix de location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">${property.price}</span>
                <span className="text-muted-foreground">/mois</span>
              </div>
              {property.rentalDetails && (
                <div className="p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-secondary" />
                    <span className="text-muted-foreground">Garantie:</span>
                    <span className="font-semibold">
                      {property.rentalDetails.guarantee ?? 0} {RENTAL_UNIT_LABELS[property.rentalDetails.unit]}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {phones.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun numéro enregistré</p>
              ) : (
                phones.map((phone) => (
                  <a key={phone.idPropertyPhone} href={`tel:${phone.phoneNumber}`}>
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      <Phone className="h-4 w-4 mr-2" />
                      {phone.phoneNumber}
                    </Button>
                  </a>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ajouté le:</span>
                <span className="font-medium">{new Date(property.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Modifié le:</span>
                <span className="font-medium">{new Date(property.updatedAt).toLocaleDateString("fr-FR")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PropertyMediaManager property={property} onChanged={setProperty} />

      <EntityTimeline key={property.updatedAt} entityType="PROPERTY" entityId={property.idProperty} />

      <EditRentalModal open={showEditModal} onOpenChange={setShowEditModal} property={property} onEdit={handleEdit} />
      <DeleteRentalModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        property={property}
        onDelete={handleDelete}
      />
    </div>
  )
}
