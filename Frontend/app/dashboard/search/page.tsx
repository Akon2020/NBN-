"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, MapPin, Home, Building2, Bed, Bath, DollarSign, Filter, Loader2 } from "lucide-react"
import { getAllProperties } from "@/actions/properties"
import { PROPERTY_TYPE_LABELS, type Property, type PropertyType } from "@/lib/types"
import { getImageUrl } from "@/lib/imageUrl"
import { AddToCartButton } from "@/components/add-to-cart-button"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"

export default function SearchPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [category, setCategory] = useState<"all" | "RENT" | "SALE">("all")
  const [propertyType, setPropertyType] = useState<PropertyType | "all">("all")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [bedrooms, setBedrooms] = useState("")
  const [quartier, setQuartier] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        setProperties(await getAllProperties())
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur inconnue")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const filteredProperties = properties.filter((property) => {
    if (category !== "all" && property.category !== category) return false

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesAddress =
        (property.quartier || "").toLowerCase().includes(search) ||
        (property.avenue || "").toLowerCase().includes(search)
      const matchesDescription = property.description?.toLowerCase().includes(search)
      if (!matchesAddress && !matchesDescription) return false
    }

    if (propertyType !== "all" && property.propertyType !== propertyType) return false

    if (minPrice && property.price < Number.parseInt(minPrice)) return false
    if (maxPrice && property.price > Number.parseInt(maxPrice)) return false

    if (bedrooms && (property.bedrooms ?? 0) < Number.parseInt(bedrooms)) return false

    if (quartier && !(property.quartier || "").toLowerCase().includes(quartier.toLowerCase())) return false

    return true
  })

  const resetFilters = () => {
    setSearchTerm("")
    setCategory("all")
    setPropertyType("all")
    setMinPrice("")
    setMaxPrice("")
    setBedrooms("")
    setQuartier("")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Recherche avancée</h1>
        <p className="text-muted-foreground mt-2">Trouvez rapidement le bien idéal avec nos filtres intelligents</p>
      </div>

      <Card className="border-border">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Recherche rapide</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Quartier, avenue, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select value={category} onValueChange={(value: "all" | "RENT" | "SALE") => setCategory(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="RENT">À louer</SelectItem>
                  <SelectItem value="SALE">À vendre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyType">Type de bien</Label>
              <Select value={propertyType} onValueChange={(value: PropertyType | "all") => setPropertyType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quartier">Quartier</Label>
              <Input
                id="quartier"
                placeholder="Kadutu, Ibanda..."
                value={quartier}
                onChange={(e) => setQuartier(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minPrice">Prix minimum (USD)</Label>
              <Input
                id="minPrice"
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPrice">Prix maximum (USD)</Label>
              <Input
                id="maxPrice"
                type="number"
                placeholder="10000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bedrooms">Chambres minimum</Label>
              <Input
                id="bedrooms"
                type="number"
                placeholder="0"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={resetFilters}>
              <Filter className="mr-2 h-4 w-4" />
              Réinitialiser les filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredProperties.length} résultat{filteredProperties.length > 1 ? "s" : ""} trouvé
              {filteredProperties.length > 1 ? "s" : ""}
            </p>
          </div>

          {filteredProperties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Aucun résultat</h3>
              <p className="text-sm text-muted-foreground mt-1">Essayez de modifier vos critères de recherche</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProperties.map((property) => (
                <Link
                  key={property.idProperty}
                  href={`/dashboard/${property.category === "RENT" ? "rentals" : "sales"}/${property.idProperty}`}
                >
                  <Card className="border-border overflow-hidden group">
                    <div className="relative aspect-video overflow-hidden">
                      <Image
                        src={getImageUrl(property.images?.[0]?.image)}
                        alt={`Property in ${property.quartier || ""}`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                      <Badge
                        className={`absolute top-2 right-2 ${property.category === "RENT" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
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
                      <div className="absolute bottom-2 right-2">
                        <AddToCartButton property={property} />
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg line-clamp-1">{property.avenue}</h3>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {property.quartier}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {(property.bedrooms ?? 0) > 0 && (
                          <div className="flex items-center gap-1">
                            <Bed className="h-4 w-4" />
                            {property.bedrooms}
                          </div>
                        )}
                        {(property.toilets ?? 0) > 0 && (
                          <div className="flex items-center gap-1">
                            <Bath className="h-4 w-4" />
                            {property.toilets}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-5 w-5 text-primary" />
                          <span className="text-2xl font-bold text-primary">{property.price}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
