"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, X } from "lucide-react"

interface AddRentalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (property: any) => void
}

export function AddRentalModal({ open, onOpenChange, onAdd }: AddRentalModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [phones, setPhones] = useState<string[]>(["", ""])
  const [formData, setFormData] = useState({
    type: "",
    neighborhood: "",
    avenue: "",
    floor: "",
    bedrooms: "",
    livingRooms: "",
    bathrooms: "",
    kitchens: "",
    price: "",
    guaranteeValue: "",
    guaranteeUnit: "",
    details: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      const newProperty = {
        id: Date.now().toString(),
        type: formData.type,
        address: { neighborhood: formData.neighborhood, avenue: formData.avenue },
        floor: Number.parseInt(formData.floor),
        bedrooms: Number.parseInt(formData.bedrooms),
        livingRooms: Number.parseInt(formData.livingRooms),
        bathrooms: Number.parseInt(formData.bathrooms),
        kitchens: Number.parseInt(formData.kitchens),
        price: Number.parseInt(formData.price),
        guarantee: { value: Number.parseInt(formData.guaranteeValue), unit: formData.guaranteeUnit },
        phones: phones.filter((p) => p),
        images: ["/diverse-property-showcase.png"],
        details: formData.details,
        score: Math.floor(Math.random() * 30) + 70,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      onAdd(newProperty)
      onOpenChange(false)
      setIsLoading(false)
      // Reset form
      setFormData({
        type: "",
        neighborhood: "",
        avenue: "",
        floor: "",
        bedrooms: "",
        livingRooms: "",
        bathrooms: "",
        kitchens: "",
        price: "",
        guaranteeValue: "",
        guaranteeUnit: "",
        details: "",
      })
      setPhones(["", ""])
    }, 1000)
  }

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...phones]
    newPhones[index] = value
    setPhones(newPhones)
  }

  const addPhoneField = () => {
    setPhones([...phones, ""])
  }

  const removePhoneField = (index: number) => {
    if (phones.length > 2) {
      setPhones(phones.filter((_, i) => i !== index))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter un bien à louer</DialogTitle>
          <DialogDescription>Remplissez les informations du bien immobilier</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Appartement</SelectItem>
                  <SelectItem value="house">Maison</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor">Étage</Label>
              <Input
                id="floor"
                type="number"
                min="0"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Quartier</Label>
              <Input
                id="neighborhood"
                placeholder="Ex: Kadutu, Ibanda"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avenue">Avenue</Label>
              <Input
                id="avenue"
                placeholder="Ex: Avenue du Commerce"
                value={formData.avenue}
                onChange={(e) => setFormData({ ...formData, avenue: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Chambres</Label>
              <Input
                id="bedrooms"
                type="number"
                min="0"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="livingRooms">Salons</Label>
              <Input
                id="livingRooms"
                type="number"
                min="0"
                value={formData.livingRooms}
                onChange={(e) => setFormData({ ...formData, livingRooms: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bathrooms">Toilettes</Label>
              <Input
                id="bathrooms"
                type="number"
                min="0"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kitchens">Cuisines</Label>
              <Input
                id="kitchens"
                type="number"
                min="0"
                value={formData.kitchens}
                onChange={(e) => setFormData({ ...formData, kitchens: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="price">Prix (USD)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                placeholder="350"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guaranteeValue">Garantie</Label>
              <Input
                id="guaranteeValue"
                type="number"
                min="0"
                placeholder="3"
                value={formData.guaranteeValue}
                onChange={(e) => setFormData({ ...formData, guaranteeValue: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guaranteeUnit">Unité</Label>
              <Select
                value={formData.guaranteeUnit}
                onValueChange={(value) => setFormData({ ...formData, guaranteeUnit: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Jours</SelectItem>
                  <SelectItem value="months">Mois</SelectItem>
                  <SelectItem value="years">Années</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Numéros de téléphone (min. 2)</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addPhoneField}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </div>
            {phones.map((phone, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="+243 999 999 999"
                  value={phone}
                  onChange={(e) => handlePhoneChange(index, e.target.value)}
                  required={index < 2}
                />
                {phones.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removePhoneField(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Détails supplémentaires</Label>
            <Textarea
              id="details"
              placeholder="Description du bien..."
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ajout...
                </>
              ) : (
                "Ajouter"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
