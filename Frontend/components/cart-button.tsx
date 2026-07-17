"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { ShoppingBag, Trash2, X } from "lucide-react"
import Image from "next/image"
import { useCart } from "@/components/cart-provider"
import { getImageUrl } from "@/lib/imageUrl"
import { PROPERTY_TYPE_LABELS } from "@/lib/types"
import { openWhatsAppShare } from "@/lib/whatsappProposal"

// GOAL 5 — point d'entrée du panier depuis n'importe quelle page du
// dashboard (monté une seule fois dans le layout, cf. dashboard/layout.tsx).
export function CartButton() {
  const { items, removeItem, clear, maxItems } = useCart()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" className="relative" onClick={() => setOpen(true)}>
        <ShoppingBag className="h-5 w-5" />
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-600 text-[10px] font-semibold text-white">
            {items.length}
          </span>
        )}
      </Button>
      <SheetContent className="flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Panier ({items.length}/{maxItems})
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun bien sélectionné pour l&apos;instant. Ajoutez des biens depuis les listes
              (location, vente, recherche, favoris) via l&apos;icône panier.
            </p>
          ) : (
            items.map((property) => (
              <div key={property.idProperty} className="flex items-center gap-3 rounded-lg border border-border p-2">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md">
                  <Image src={getImageUrl(property.images?.[0]?.image)} alt="" fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {PROPERTY_TYPE_LABELS[property.propertyType]} — {property.quartier}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${Number(property.price).toLocaleString("fr-FR")}
                    {property.category === "RENT" ? "/mois" : ""}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-destructive"
                  onClick={() => removeItem(property.idProperty)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="border-t border-border flex-col gap-2 sm:flex-col">
            <Button className="w-full gap-2 bg-secondary-600 text-white hover:bg-secondary-600/90" onClick={() => openWhatsAppShare(items)}>
              Partager via WhatsApp
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={clear}>
              <Trash2 className="h-4 w-4" />
              Vider le panier
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
