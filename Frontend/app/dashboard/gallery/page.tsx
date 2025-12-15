"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageIcon, Home, Building2, Eye, Heart, Share2 } from "lucide-react"
import { mockRentals, mockSales } from "@/lib/mock-data"
import Image from "next/image"
import Link from "next/link"

export default function GalleryPage() {
  const [filter, setFilter] = useState<"all" | "rent" | "sale">("all")
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  useEffect(() => {
    const saved = localStorage.getItem("favorites")
    if (saved) {
      setFavorites(new Set(JSON.parse(saved)))
    }
  }, [])

  const allProperties = [
    ...mockRentals.map((p) => ({ ...p, category: "rent" as const })),
    ...mockSales.map((p) => ({ ...p, category: "sale" as const })),
  ]

  const filteredProperties = filter === "all" ? allProperties : allProperties.filter((p) => p.category === filter)

  const toggleFavorite = (id: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(id)) {
      newFavorites.delete(id)
    } else {
      newFavorites.add(id)
    }
    setFavorites(newFavorites)
    localStorage.setItem("favorites", JSON.stringify(Array.from(newFavorites)))
  }

  const handlePropose = (property: any) => {
    const message = `🏠 *Proposition Nyumbani Express*\n\n${property.category === "rent" ? "À louer" : "À vendre"}\n📍 ${property.address.neighborhood}, ${property.address.avenue}\n💰 Prix: $${property.price}${property.category === "rent" ? "/mois" : ""}\n\n${property.details || "Belle propriété disponible"}\n\n📞 Contact: ${property.phones[0]}`

    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Galerie d'images</h1>
          <p className="text-muted-foreground mt-2">Toutes les images des biens immobiliers</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les biens</SelectItem>
              <SelectItem value="rent">À louer</SelectItem>
              <SelectItem value="sale">À vendre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProperties.map((property) => (
          <Card key={property.id} className="border-border overflow-hidden group relative">
            <div className="relative aspect-square overflow-hidden">
              <Image
                src={property.images[0] || "/placeholder.svg"}
                alt={`Property in ${property.address.neighborhood}`}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Badge
                className={`absolute top-2 right-2 ${property.category === "rent" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
              >
                {property.category === "rent" ? (
                  <>
                    <Home className="h-3 w-3 mr-1" />
                    Louer
                  </>
                ) : (
                  <>
                    <Building2 className="h-3 w-3 mr-1" />
                    Vendre
                  </>
                )}
              </Badge>
              <div className="absolute bottom-2 left-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 h-8 text-xs"
                  onClick={() => handlePropose(property)}
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  Proposer
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className={`h-8 w-8 p-0 ${favorites.has(property.id) ? "bg-accent text-accent-foreground" : ""}`}
                  onClick={() => toggleFavorite(property.id)}
                >
                  <Heart className={`h-3 w-3 ${favorites.has(property.id) ? "fill-current" : ""}`} />
                </Button>
                <Button size="sm" variant="secondary" className="h-8 w-8 p-0" asChild>
                  <Link href={`/dashboard/${property.category === "rent" ? "rentals" : "sales"}`}>
                    <Eye className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ImageIcon className="h-3 w-3" />
                  {property.address.neighborhood}
                </div>
                <div className="font-semibold text-sm">${property.price}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProperties.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucune image trouvée</h3>
          <p className="text-sm text-muted-foreground mt-1">Ajoutez des biens pour voir leurs images ici</p>
        </div>
      )}
    </div>
  )
}
