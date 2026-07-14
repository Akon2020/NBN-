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
import { LAND_PROPERTY_TYPES, type Property, type PropertyType } from "@/lib/types";
import { toast } from "sonner";

interface EditSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
  onEdit: (property: Property) => void;
}

export function EditSaleModal({
  open,
  onOpenChange,
  property,
  onEdit,
}: EditSaleModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [propertyType, setPropertyType] = useState<PropertyType>("CONSTRUCTION_DURABLE");
  const [quartier, setQuartier] = useState("");
  const [avenue, setAvenue] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [floors, setFloors] = useState("0");
  const [bedrooms, setBedrooms] = useState("0");
  const [livingRooms, setLivingRooms] = useState("0");
  const [toilets, setToilets] = useState("0");
  const [kitchens, setKitchens] = useState("0");
  const [price, setPrice] = useState("");
  const [margin, setMargin] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (property) {
      setPropertyType(property.propertyType);
      setQuartier(property.quartier || "");
      setAvenue(property.avenue || "");
      setFullAddress(property.fullAddress || "");
      setFloors((property.floors ?? 0).toString());
      setBedrooms((property.bedrooms ?? 0).toString());
      setLivingRooms((property.livingRooms ?? 0).toString());
      setToilets((property.toilets ?? 0).toString());
      setKitchens((property.kitchens ?? 0).toString());
      setPrice(property.price.toString());
      setMargin((property.margin ?? 0).toString());
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
        fullAddress,
        floors: isLand ? 0 : Number.parseInt(floors),
        bedrooms: isLand ? 0 : Number.parseInt(bedrooms),
        livingRooms: isLand ? 0 : Number.parseInt(livingRooms),
        toilets: isLand ? 0 : Number.parseInt(toilets),
        kitchens: isLand ? 0 : Number.parseInt(kitchens),
        price: Number.parseFloat(price),
        margin: Number.parseFloat(margin),
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

  const isLand = LAND_PROPERTY_TYPES.includes(propertyType);

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le bien à vendre</DialogTitle>
          <DialogDescription>
            Mettez à jour les informations de ce bien
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-sale-type">Type de bien *</Label>
            <Select value={propertyType} onValueChange={(value: PropertyType) => setPropertyType(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONSTRUCTION_DURABLE">Construction durable</SelectItem>
                <SelectItem value="CONSTRUCTION_SEMI_DURABLE">
                  Construction semi-durable
                </SelectItem>
                <SelectItem value="TERRAIN_PLAT">Terrain plat</SelectItem>
                <SelectItem value="TERRAIN_PENTE">Terrain en pente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
                  <Label htmlFor="edit-sale-toilets">Douches/WC *</Label>
                  <Input
                    id="edit-sale-toilets"
                    type="number"
                    min="0"
                    value={toilets}
                    onChange={(e) => setToilets(e.target.value)}
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
            <Label htmlFor="edit-sale-description">Détails supplémentaires</Label>
            <Textarea
              id="edit-sale-description"
              placeholder="Description du bien, commodités, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
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
