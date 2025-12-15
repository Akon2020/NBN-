"use client"

import { useState, use } from "react"
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
  Building,
} from "lucide-react"
import { mockSales } from "@/lib/mock-data"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { EditSaleModal } from "@/components/property-modals/edit-sale-modal"
import type { SaleProperty } from "@/lib/types"

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [property, setProperty] = useState<SaleProperty | null>(mockSales.find((p) => p.id === id) || null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Bien non trouvé</h2>
        <p className="text-muted-foreground mb-6">Ce bien à vendre n'existe pas ou a été supprimé</p>
        <Link href="/dashboard/sales">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux biens à vendre
          </Button>
        </Link>
      </div>
    )
  }

  const handleEdit = (updatedProperty: SaleProperty) => {
    setProperty(updatedProperty)
  }

  const handleDelete = () => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce bien ?")) {
      router.push("/dashboard/sales")
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      durable: "Construction durable",
      "semi-durable": "Construction semi-durable",
      "flat-land": "Terrain plat",
      "slope-land": "Terrain en pente",
    }
    return labels[type] || type
  }

  const isLand = property.type === "flat-land" || property.type === "slope-land"

  const handleWhatsAppProposal = () => {
    const message = `Bonjour! Je vous propose ce bien à vendre:\n\n${getTypeLabel(property.type)}\nAdresse: ${property.address.fullAddress}\n${!isLand ? `${property.floors} étages, ${property.bedrooms} chambres, ${property.livingRooms} salons, ${property.bathrooms} douches, ${property.kitchens} cuisines\n` : ""}Prix: $${property.price.toLocaleString()}\nMarge: $${property.margin.toLocaleString()}\n\nPour plus d'informations, contactez-nous!`

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Link href="/dashboard/sales">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setIsFavorite(!isFavorite)}>
            <Heart className={`h-4 w-4 mr-2 ${isFavorite ? "fill-current text-red-500" : ""}`} />
            {isFavorite ? "Retiré" : "Favoris"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleWhatsAppProposal}>
            <Share2 className="h-4 w-4 mr-2" />
            Proposer
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button variant="outline" size="sm" className="text-destructive bg-transparent" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          <Card className="border-border overflow-hidden">
            <div className="relative aspect-video bg-muted">
              {property.images.length > 0 ? (
                <Image
                  src={property.images[currentImageIndex] || "/placeholder.svg"}
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
            {property.images.length > 1 && (
              <div className="p-4 flex gap-2 overflow-x-auto">
                {property.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 ${
                      currentImageIndex === index ? "border-primary" : "border-border"
                    }`}
                  >
                    <Image
                      src={image || "/placeholder.svg"}
                      alt={`Miniature ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Property Details */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-2xl text-balance">{property.address.avenue}</CardTitle>
                  <div className="flex items-center text-muted-foreground mt-2">
                    <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="text-sm">{property.address.fullAddress}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className="bg-secondary text-secondary-foreground whitespace-nowrap">
                    {getTypeLabel(property.type)}
                  </Badge>
                  {property.score && (
                    <Badge className="bg-primary text-primary-foreground">Score: {property.score}</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isLand && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <Building className="h-5 w-5 text-secondary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Étages</p>
                        <p className="text-lg font-semibold">{property.floors}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <Bed className="h-5 w-5 text-secondary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Chambres</p>
                        <p className="text-lg font-semibold">{property.bedrooms}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <HomeIcon className="h-5 w-5 text-secondary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Salons</p>
                        <p className="text-lg font-semibold">{property.livingRooms}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <Bath className="h-5 w-5 text-secondary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Douches</p>
                        <p className="text-lg font-semibold">{property.bathrooms}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <HomeIcon className="h-5 w-5 text-secondary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Cuisines</p>
                        <p className="text-lg font-semibold">{property.kitchens}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />
                </>
              )}

              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{property.details || "Aucune description disponible"}</p>
              </div>

              {property.gpsLocation && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Localisation GPS</h3>
                    <p className="text-muted-foreground">
                      Latitude: {property.gpsLocation.latitude}, Longitude: {property.gpsLocation.longitude}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Price Card */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Prix de vente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-secondary">${property.price.toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Marge:</span>
                  <span className="font-semibold">${property.margin.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Card */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {property.phones.map((phone, index) => (
                <a key={index} href={`tel:${phone}`}>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Phone className="h-4 w-4 mr-2" />
                    {phone}
                  </Button>
                </a>
              ))}
            </CardContent>
          </Card>

          {/* Metadata Card */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ajouté le:</span>
                <span className="font-medium">{property.createdAt.toLocaleDateString("fr-FR")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Modifié le:</span>
                <span className="font-medium">{property.updatedAt.toLocaleDateString("fr-FR")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <EditSaleModal open={showEditModal} onOpenChange={setShowEditModal} property={property} onEdit={handleEdit} />
    </div>
  )
}
