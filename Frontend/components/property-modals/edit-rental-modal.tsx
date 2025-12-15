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
import type { RentalProperty } from "@/lib/types"

interface EditRentalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property: RentalProperty | null
  onEdit: (property: RentalProperty) => void
}

export function EditRentalModal({ open, onOpenChange, property, onEdit }: EditRentalModalProps) {
  const [type, setType] = useState<"apartment" | "house">("apartment")
  const [neighborhood, setNeighborhood] = useState("")
  const [avenue, setAvenue] = useState("")
  const [floor, setFloor] = useState("0")
  const [bedrooms, setBedrooms] = useState("0")
  const [livingRooms, setLivingRooms] = useState("0")
  const [bathrooms, setBathrooms] = useState("0")
  const [kitchens, setKitchens] = useState("0")
  const [price, setPrice] = useState("")
  const [guaranteeValue, setGuaranteeValue] = useState("")
  const [guaranteeUnit, setGuaranteeUnit] = useState<"months" | "years" | "days">("months")
  const [phones, setPhones] = useState<string[]>([""])
  const [images, setImages] = useState<string[]>([""])
  const [details, setDetails] = useState("")

  useEffect(() => {
    if (property) {
      setType(property.type)
      setNeighborhood(property.address.neighborhood)
      setAvenue(property.address.avenue)
      setFloor(property.floor.toString())
      setBedrooms(property.bedrooms.toString())
      setLivingRooms(property.livingRooms.toString())
      setBathrooms(property.bathrooms.toString())
      setKitchens(property.kitchens.toString())
      setPrice(property.price.toString())
      setGuaranteeValue(property.guarantee.value.toString())
      setGuaranteeUnit(property.guarantee.unit)
      setPhones(property.phones.length > 0 ? property.phones : [""])
      setImages(property.images.length > 0 ? property.images : [""])
      setDetails(property.details)
    }
  }, [property])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (property) {
      const updatedProperty: RentalProperty = {
        ...property,
        type,
        address: { neighborhood, avenue },
        floor: Number.parseInt(floor),
        bedrooms: Number.parseInt(bedrooms),
        livingRooms: Number.parseInt(livingRooms),
        bathrooms: Number.parseInt(bathrooms),
        kitchens: Number.parseInt(kitchens),
        price: Number.parseFloat(price),
        guarantee: {
          value: Number.parseInt(guaranteeValue),
          unit: guaranteeUnit,
        },
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

  if (!property) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le bien à louer</DialogTitle>
          <DialogDescription>Mettez à jour les informations de ce bien</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type de bien *</Label>
              <Select value={type} onValueChange={(value: any) => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Appartement</SelectItem>
                  <SelectItem value="house">Maison</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-neighborhood">Quartier *</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-avenue">Avenue/Rue *</Label>
            <Input
              id="edit-avenue"
              placeholder="Avenue de la Paix"
              value={avenue}
              onChange={(e) => setAvenue(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="edit-floor">Étage</Label>
              <Input
                id="edit-floor"
                type="number"
                min="0"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bedrooms">Chambres *</Label>
              <Input
                id="edit-bedrooms"
                type="number"
                min="0"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-livingRooms">Salons *</Label>
              <Input
                id="edit-livingRooms"
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
              <Label htmlFor="edit-bathrooms">Douches/WC *</Label>
              <Input
                id="edit-bathrooms"
                type="number"
                min="0"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-kitchens">Cuisines *</Label>
              <Input
                id="edit-kitchens"
                type="number"
                min="0"
                value={kitchens}
                onChange={(e) => setKitchens(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Prix de location ($) *</Label>
              <Input
                id="edit-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Garantie *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="Valeur"
                  className="flex-1"
                  value={guaranteeValue}
                  onChange={(e) => setGuaranteeValue(e.target.value)}
                  required
                />
                <Select value={guaranteeUnit} onValueChange={(value: any) => setGuaranteeUnit(value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Jours</SelectItem>
                    <SelectItem value="months">Mois</SelectItem>
                    <SelectItem value="years">Ans</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            <Label htmlFor="edit-details">Détails supplémentaires</Label>
            <Textarea
              id="edit-details"
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
