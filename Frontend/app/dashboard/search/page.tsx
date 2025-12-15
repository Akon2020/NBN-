"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, Home, Building2, Bed, Bath, DollarSign, Filter } from "lucide-react"
import { mockRentals, mockSales } from "@/lib/mock-data"
import Image from "next/image"

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [category, setCategory] = useState<"all" | "rent" | "sale">("all")
  const [propertyType, setPropertyType] = useState("all")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [bedrooms, setBedrooms] = useState("")
  const [neighborhood, setNeighborhood] = useState("")

  const allProperties = [
    ...mockRentals.map((p) => ({ ...p, category: "rent" as const })),
    ...mockSales.map((p) => ({ ...p, category: "sale" as const })),
  ]

  const filteredProperties = allProperties.filter((property) => {
    // Category filter
    if (category !== "all" && property.category !== category) return false

    // Search term (address or details)
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesAddress =
        property.address.neighborhood.toLowerCase().includes(search) ||
        property.address.avenue.toLowerCase().includes(search)
      const matchesDetails = property.details?.toLowerCase().includes(search)
      if (!matchesAddress && !matchesDetails) return false
    }

    // Property type
    if (propertyType !== "all") {
      if (property.type !== propertyType) return false
    }

    // Price range
    if (minPrice && property.price < Number.parseInt(minPrice)) return false
    if (maxPrice && property.price > Number.parseInt(maxPrice)) return false

    // Bedrooms
    if (bedrooms && property.bedrooms < Number.parseInt(bedrooms)) return false

    // Neighborhood
    if (neighborhood && !property.address.neighborhood.toLowerCase().includes(neighborhood.toLowerCase())) return false

    return true
  })

  const resetFilters = () => {
    setSearchTerm("")
    setCategory("all")
    setPropertyType("all")
    setMinPrice("")
    setMaxPrice("")
    setBedrooms("")
    setNeighborhood("")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Recherche avancée</h1>
        <p className="text-muted-foreground mt-2">Trouvez rapidement le bien idéal avec nos filtres intelligents</p>
      </div>

      {/* Search filters */}
      <Card className="border-border">
        <CardContent className="p-6 space-y-4">
          {/* Search bar */}
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

          {/* Filter grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select value={category} onValueChange={(value: any) => setCategory(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="rent">À louer</SelectItem>
                  <SelectItem value="sale">À vendre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyType">Type de bien</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="apartment">Appartement</SelectItem>
                  <SelectItem value="house">Maison</SelectItem>
                  <SelectItem value="durable">Construction durable</SelectItem>
                  <SelectItem value="semi-durable">Semi-durable</SelectItem>
                  <SelectItem value="flat-land">Terrain plat</SelectItem>
                  <SelectItem value="slope-land">Terrain en pente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="neighborhood">Quartier</Label>
              <Input
                id="neighborhood"
                placeholder="Kadutu, Ibanda..."
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
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

      {/* Results */}
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
            <Card key={property.id} className="border-border overflow-hidden group">
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={property.images[0] || "/placeholder.svg"}
                  alt={`Property in ${property.address.neighborhood}`}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
                <Badge
                  className={`absolute top-2 right-2 ${property.category === "rent" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                >
                  {property.category === "rent" ? (
                    <>
                      <Home className="h-3 w-3 mr-1" />À louer
                    </>
                  ) : (
                    <>
                      <Building2 className="h-3 w-3 mr-1" />À vendre
                    </>
                  )}
                </Badge>
                {property.score && (
                  <Badge className="absolute top-2 left-2 bg-background/80 backdrop-blur text-foreground">
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
                  {property.bedrooms > 0 && (
                    <div className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      {property.bedrooms}
                    </div>
                  )}
                  {property.bathrooms > 0 && (
                    <div className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      {property.bathrooms}
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
          ))}
        </div>
      )}
    </div>
  )
}
