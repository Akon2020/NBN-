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
import { createProperty } from "@/actions/properties"
import { RENTAL_UNIT_PRICE_SUFFIX, type Property, type PropertyType, type RentalUnit } from "@/lib/types"
import { toast } from "sonner"

interface AddRentalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (property: Property) => void
}

export function AddRentalModal({ open, onOpenChange, onAdd }: AddRentalModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [phones, setPhones] = useState<string[]>(["", ""])
  const [formData, setFormData] = useState({
    propertyType: "" as PropertyType | "",
    quartier: "",
    avenue: "",
    floors: "",
    bedrooms: "",
    livingRooms: "",
    toilets: "",
    kitchens: "",
    price: "",
    guarantee: "",
    unit: "" as RentalUnit | "",
    description: "",
  })

  const resetForm = () => {
    setFormData({
      propertyType: "",
      quartier: "",
      avenue: "",
      floors: "",
      bedrooms: "",
      livingRooms: "",
      toilets: "",
      kitchens: "",
      price: "",
      guarantee: "",
      unit: "",
      description: "",
    })
    setPhones(["", ""])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.propertyType || !formData.unit) return

    setIsLoading(true)
    try {
      const created = await createProperty({
        category: "RENT",
        propertyType: formData.propertyType,
        quartier: formData.quartier,
        avenue: formData.avenue,
        floors: Number.parseInt(formData.floors) || 0,
        bedrooms: Number.parseInt(formData.bedrooms) || 0,
        livingRooms: Number.parseInt(formData.livingRooms) || 0,
        toilets: Number.parseInt(formData.toilets) || 0,
        kitchens: Number.parseInt(formData.kitchens) || 0,
        price: Number.parseFloat(formData.price),
        guarantee: Number.parseFloat(formData.guarantee),
        unit: formData.unit,
        phones: phones.filter((p) => p.trim() !== ""),
        description: formData.description,
      })
      onAdd(created)
      onOpenChange(false)
      resetForm()
      toast.success("Bien à louer ajouté avec succès")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
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
              <Label htmlFor="propertyType">Type</Label>
              <Select
                value={formData.propertyType}
                onValueChange={(value: PropertyType) => setFormData({ ...formData, propertyType: value })}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionnez le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPARTEMENT">Appartement</SelectItem>
                  <SelectItem value="MAISON">Maison</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="floors">Étage</Label>
              <Input
                id="floors"
                type="number"
                min="0"
                value={formData.floors}
                onChange={(e) => setFormData({ ...formData, floors: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quartier">Quartier</Label>
              <Input
                id="quartier"
                placeholder="Ex: Nyalukemba, Ndendere"
                value={formData.quartier}
                onChange={(e) => setFormData({ ...formData, quartier: e.target.value })}
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
              <Label htmlFor="toilets">Toilettes</Label>
              <Input
                id="toilets"
                type="number"
                min="0"
                value={formData.toilets}
                onChange={(e) => setFormData({ ...formData, toilets: e.target.value })}
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
              <Label htmlFor="price">
                Prix (USD){formData.unit ? ` ${RENTAL_UNIT_PRICE_SUFFIX[formData.unit]}` : ""}
              </Label>
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
              <Label htmlFor="guarantee">Garantie</Label>
              <Input
                id="guarantee"
                type="number"
                min="0"
                placeholder="3"
                value={formData.guarantee}
                onChange={(e) => setFormData({ ...formData, guarantee: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unité</Label>
              <Select
                value={formData.unit}
                onValueChange={(value: RentalUnit) => setFormData({ ...formData, unit: value })}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAY">Jours (courte durée)</SelectItem>
                  <SelectItem value="MONTH">Mois (longue durée)</SelectItem>
                  <SelectItem value="YEAR">Années (longue durée)</SelectItem>
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
            <Label htmlFor="description">Détails supplémentaires</Label>
            <Textarea
              id="description"
              placeholder="Description du bien..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
