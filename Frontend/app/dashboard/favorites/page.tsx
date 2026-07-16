"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Heart, Home, Building2, MapPin, Share2, X, Check, Loader2 } from "lucide-react"
import { getAllProperties } from "@/actions/properties"
import { getMyFavorites, removeFavorite } from "@/actions/favorites"
import { PROPERTY_TYPE_LABELS, type Property } from "@/lib/types"
import { getImageUrl } from "@/lib/imageUrl"
import Image from "next/image"
import { toast } from "sonner"

const MAX_GROUP_SIZE = 6

export default function FavoritesPage() {
  const [favoriteProperties, setFavoriteProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedForGroup, setSelectedForGroup] = useState<Set<number>>(new Set())

  useEffect(() => {
    const load = async () => {
      try {
        const [favorites, allProperties] = await Promise.all([
          getMyFavorites(),
          getAllProperties(),
        ])
        const favoriteIds = new Set(favorites.map((f) => f.idProperty))
        setFavoriteProperties(allProperties.filter((p) => favoriteIds.has(p.idProperty)))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur inconnue")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const handleRemoveFavorite = async (id: number) => {
    try {
      await removeFavorite(id)
      setFavoriteProperties(favoriteProperties.filter((p) => p.idProperty !== id))
      const newSelection = new Set(selectedForGroup)
      newSelection.delete(id)
      setSelectedForGroup(newSelection)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  const toggleSelection = (id: number) => {
    const newSelection = new Set(selectedForGroup)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      if (newSelection.size >= MAX_GROUP_SIZE) {
        toast.error(`Vous ne pouvez sélectionner que ${MAX_GROUP_SIZE} biens maximum`)
        return
      }
      newSelection.add(id)
    }
    setSelectedForGroup(newSelection)
  }

  const sendGroupProposal = () => {
    if (selectedForGroup.size === 0) {
      toast.error("Veuillez sélectionner au moins un bien")
      return
    }

    const selectedProperties = favoriteProperties.filter((p) => selectedForGroup.has(p.idProperty))
    let message = `🏠 *Proposition Groupée Nyumbani Express*\n\n`
    message += `Nous avons ${selectedProperties.length} biens qui pourraient vous intéresser:\n\n`

    selectedProperties.forEach((property, index) => {
      message += `*${index + 1}. ${property.category === "RENT" ? "À louer" : "À vendre"}*\n`
      message += `📍 ${property.quartier}, ${property.avenue}\n`
      message += `💰 $${property.price}${property.category === "RENT" ? "/mois" : ""}\n\n`
    })

    message += `📞 Contactez-nous pour plus d'informations`

    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Mes Favoris</h1>
          <p className="text-muted-foreground mt-2">Biens sauvegardés pour référence rapide</p>
        </div>
        {selectedForGroup.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{selectedForGroup.size} sélectionnés</Badge>
            <Button
              onClick={sendGroupProposal}
              className="bg-secondary text-secondary-foreground w-full sm:w-auto"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Envoyer proposition groupée
            </Button>
          </div>
        )}
      </div>

      {favoriteProperties.length > 0 && (
        <Alert className="border-primary/50 bg-primary/5">
          <AlertDescription className="text-sm">
            Sélectionnez jusqu'à {MAX_GROUP_SIZE} biens pour créer une proposition groupée via WhatsApp
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : favoriteProperties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Heart className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucun favori pour le moment</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ajoutez des biens à vos favoris pour les retrouver facilement
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favoriteProperties.map((property) => {
            const isSelected = selectedForGroup.has(property.idProperty)
            return (
              <Card
                key={property.idProperty}
                className={`border-border overflow-hidden group relative cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary" : ""}`}
                onClick={() => toggleSelection(property.idProperty)}
              >
                {isSelected && (
                  <div className="absolute top-2 left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-5 w-5" />
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-10 h-8 w-8 bg-background/80 backdrop-blur hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveFavorite(property.idProperty)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="relative aspect-video overflow-hidden">
                  <Image
                    src={getImageUrl(property.images?.[0]?.image)}
                    alt={`Property in ${property.quartier || ""}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <Badge
                    className={`absolute bottom-2 left-2 ${property.category === "RENT" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                  >
                    {property.category === "RENT" ? (
                      <>
                        <Home className="h-3 w-3 mr-1" />À louer
                      </>
                    ) : (
                      <>
                        <Building2 className="h-3 w-3 mr-1" />À vendre
                      </>
                    )}
                  </Badge>
                </div>
                <CardContent className="p-4 space-y-2">
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-1">{property.avenue}</h3>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      {property.quartier}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="text-2xl font-bold text-primary">${property.price}</div>
                    <Badge variant="secondary" className="text-xs">
                      {PROPERTY_TYPE_LABELS[property.propertyType]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
