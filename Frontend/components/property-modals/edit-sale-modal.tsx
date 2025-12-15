"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X } from "lucide-react"
import type { SaleProperty } from "@/lib/types"

interface EditSaleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property: SaleProperty | null
  onEdit: (property: SaleProperty) => void
}

export function EditSaleModal({ open, onOpenChange, property, onEdit }: EditSaleModalProps) {
  const [type, setType] = useState<"durable" | "semi-durable" | "flat-land" | "slope-land">("durable")
  const [neighborhood, setNeighborhood] = useState("")
  const [avenue, setAvenue] = useState("")
  const [fullAddress, setFullAddress] = useState("")
  const [floors, setFloors] = useState("0")
  const [bedrooms, setBedrooms] = useState("0")
  const [livingRooms, setLivingRooms] = useState("0")
  const [bathrooms, setBathrooms] = useState("0")
  const [kitchens, setKitchens] = useState("0")
  const [price, setPrice] = useState("")
  const [margin, setMargin] = useState("")
  const [phones, setPhones] = useState<string[]>([""])
  const [images, setImages] = useState<string[]>([""])
  const [details, setDetails] = useState("")

  useEffect(() => {
    if (property) {
      setType(property.type)
      setNeighborhood(property.address.neighborhood)
      setAvenue(property.address.avenue)
      setFullAddress(property.address.fullAddress)
      setFloors(property.floors.toString())
      setBedrooms(property.bedrooms.toString())
      setLivingRooms(property.livingRooms.toString())
      setBathrooms(property.bathrooms.toString())
      setKitchens(property.kitchens.toString())
      setPrice(property.price.toString())
      setMargin(property.margin.toString())
      setPhones(property.phones.length > 0 ? property.phones : [""])
      setImages(property.images.length > 0 ? property.images : [""])
      setDetails(property.details)
    }
  }, [property])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (property) {
      const updatedProperty: SaleProperty = {
        ...property,
        type,
        address: { neighborhood, avenue, fullAddress },
        floors: Number.parseInt(floors),
        bedrooms: Number.parseInt(bedrooms),
        livingRooms: Number.parseInt(livingRooms),
        bathrooms: Number.parseInt(bathrooms),
        kitchens: Number.parseInt(kitchens),
        price: Number.parseFloat(price),
        margin: Number.parseFloat(margin),
        phones: phones.filter((p) => p.trim() !== ""),
        images: images.filter((img) => img.trim() !== ""),
        details,
        updatedAt: new Date(),
      }

      onEdit(updatedProperty)
      onOpenChange(false)
    }
  }

  const addPhone = () => setPhones([...phones, ""])
  const removePhone = (index: number) => setPhones(phones.filter((_, i) => i !== index))
  const updatePhone = (index: number, value: string) => {
    const newPhones = [...phones]
    newPhones[index] = value
    setPhones(newPhones)
  }

  const addImage = () => setImages([...images, ""])
  const removeImage = (index: number) => setImages(images.filter((_, i) => i !== index))
  const updateImage = (index: number, value: string) => {
    const newImages = [...images]
    newImages[index] = value
    setImages(newImages)
  }

  const isLand = type === "flat-land" || type === "slope-land"

  if (!property) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le bien à vendre</DialogTitle>
          <DialogDescription>Mettez à jour les informations de ce bien</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-sale-type">Type de bien *</Label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="durable">Construction durable</SelectItem>
                <SelectItem value="semi-durable">Construction semi-durable</SelectItem>
                <SelectItem value="flat-land">Terrain plat</SelectItem>
                <SelectItem value="slope-land">Terrain en pente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-sale-neighborhood">Quartier *</Label>
              <Select value={neighborhood} onValueChange={setNeighborhood}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ibanda">Ibanda</SelectItem>
                  <SelectItem value="Kadutu">Kadutu</SelectItem>
                  <SelectItem value="Bagira">Bagira</SelectItem>
                  <SelectItem value="Nyalukemba">Nyalukemba</SelectItem>
                  <SelectItem value="Panzi">Panzi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-sale-avenue">Avenue/Rue *</Label>
              <Input
                id="edit-sale-avenue"
                placeholder="Avenue de la Paix"
                value={avenue}
                onChange={(e) => setAvenue(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-sale-fullAddress">Adresse complète *</Label>
            <Input
              id="edit-sale-fullAddress"
              placeholder="Numéro 123, Avenue de la Paix, Ibanda, Bukavu"
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
              required
            />
          </div>

          {!isLand && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-sale-floors">Nombre d'étages *</Label>
                  <Input
                    id="edit-sale-floors"
                    type="number"
                    min="0"
                    value={floors}
                    onChange={(e) => setFloors(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-sale-bedrooms">Chambres *</Label>
                  <Input
                    id="edit-sale-bedrooms"
                    type="number"
                    min="0"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-sale-livingRooms">Salons *</Label>
                  <Input
                    id="edit-sale-livingRooms"
                    type="number"
                    min="0"
                    value={livingRooms}
                    onChange={(e) => setLivingRooms(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-sale-bathrooms">Douches/WC *</Label>
                  <Input
                    id="edit-sale-bathrooms"
                    type="number"
                    min="0"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-sale-kitchens">Cuisines *</Label>
                  <Input
                    id="edit-sale-kitchens"
                    type="number"
                    min="0"
                    value={kitchens}
                    onChange={(e) => setKitchens(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-sale-price">Prix de vente ($) *</Label>
              <Input
                id="edit-sale-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-sale-margin">Marge ($) *</Label>
              <Input
                id="edit-sale-margin"
                type="number"
                min="0"
                step="0.01"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Numéros de téléphone *</Label>
            {phones.map((phone, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="+243 999 000 111"
                  value={phone}
                  onChange={(e) => updatePhone(index, e.target.value)}
                  required
                />
                {phones.length > 1 && (
                  <Button type="button" variant="outline" size="icon" onClick={() => removePhone(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addPhone} className="w-full bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un numéro
            </Button>
          </div>

          <div className="space-y-2">
            <Label>URLs des images</Label>
            {images.map((image, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={image}
                  onChange={(e) => updateImage(index, e.target.value)}
                />
                {images.length > 1 && (
                  <Button type="button" variant="outline" size="icon" onClick={() => removeImage(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addImage} className="w-full bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une image
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-sale-details">Détails supplémentaires</Label>
            <Textarea
              id="edit-sale-details"
              placeholder="Description du bien, commodités, etc."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground">
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
