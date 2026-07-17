"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { updateProperty } from "@/actions/properties";
import type { Property, PropertyType, RentalUnit } from "@/lib/types";
import { toast } from "sonner";

interface EditRentalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
  onEdit: (property: Property) => void;
}

export function EditRentalModal({
  open,
  onOpenChange,
  property,
  onEdit,
}: EditRentalModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [propertyType, setPropertyType] = useState<PropertyType>("APPARTEMENT");
  const [quartier, setQuartier] = useState("");
  const [avenue, setAvenue] = useState("");
  const [floors, setFloors] = useState("0");
  const [bedrooms, setBedrooms] = useState("0");
  const [livingRooms, setLivingRooms] = useState("0");
  const [toilets, setToilets] = useState("0");
  const [kitchens, setKitchens] = useState("0");
  const [price, setPrice] = useState("");
  const [guarantee, setGuarantee] = useState("");
  const [unit, setUnit] = useState<RentalUnit>("MONTH");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (property) {
      setPropertyType(property.propertyType);
      setQuartier(property.quartier || "");
      setAvenue(property.avenue || "");
      setFloors((property.floors ?? 0).toString());
      setBedrooms((property.bedrooms ?? 0).toString());
      setLivingRooms((property.livingRooms ?? 0).toString());
      setToilets((property.toilets ?? 0).toString());
      setKitchens((property.kitchens ?? 0).toString());
      setPrice(property.price.toString());
      setGuarantee((property.rentalDetails?.guarantee ?? 0).toString());
      setUnit(property.rentalDetails?.unit || "MONTH");
      setDescription(property.description || "");
    }
  }, [property]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;

    setIsLoading(true);
    try {
      const updated = await updateProperty(property.idProperty, {
        propertyType,
        quartier,
        avenue,
        floors: Number.parseInt(floors),
        bedrooms: Number.parseInt(bedrooms),
        livingRooms: Number.parseInt(livingRooms),
        toilets: Number.parseInt(toilets),
        kitchens: Number.parseInt(kitchens),
        price: Number.parseFloat(price),
        guarantee: Number.parseFloat(guarantee),
        unit,
        description,
      });
      onEdit(updated);
      onOpenChange(false);
      toast.success("Bien mis à jour avec succès");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  };

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le bien à louer</DialogTitle>
          <DialogDescription>
            Mettez à jour les informations de ce bien
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type de bien *</Label>
              <Select
                value={propertyType}
                onValueChange={(value: PropertyType) => setPropertyType(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPARTEMENT">Appartement</SelectItem>
                  <SelectItem value="MAISON">Maison</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-quartier">Quartier *</Label>
              <Input
                id="edit-quartier"
                placeholder="Nyalukemba"
                value={quartier}
                onChange={(e) => setQuartier(e.target.value)}
                required
              />
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
              <Label htmlFor="edit-floors">Étage</Label>
              <Input
                id="edit-floors"
                type="number"
                min="0"
                value={floors}
                onChange={(e) => setFloors(e.target.value)}
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
              <Label htmlFor="edit-toilets">Douches/WC *</Label>
              <Input
                id="edit-toilets"
                type="number"
                min="0"
                value={toilets}
                onChange={(e) => setToilets(e.target.value)}
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
                  value={guarantee}
                  onChange={(e) => setGuarantee(e.target.value)}
                  required
                />
                <Select
                  value={unit}
                  onValueChange={(value: RentalUnit) => setUnit(value)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAY">Jours</SelectItem>
                    <SelectItem value="MONTH">Mois</SelectItem>
                    <SelectItem value="YEAR">Ans</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Détails supplémentaires</Label>
            <Textarea
              id="edit-description"
              placeholder="Description du bien, commodités, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer les modifications"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
