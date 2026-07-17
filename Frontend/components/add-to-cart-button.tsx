"use client"

import { Button } from "@/components/ui/button"
import { ShoppingBag, Check } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import type { Property } from "@/lib/types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface AddToCartButtonProps {
  property: Property
  className?: string
}

// GOAL 5 — bouton réutilisé sur chaque carte de bien (location, vente,
// recherche, favoris, galerie) pour construire le panier WhatsApp.
export function AddToCartButton({ property, className }: AddToCartButtonProps) {
  const { isInCart, toggleItem, maxItems, items } = useCart()
  const inCart = isInCart(property.idProperty)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!inCart && items.length >= maxItems) {
      toast.error(`Le panier est limité à ${maxItems} biens`)
      return
    }
    toggleItem(property)
    toast.success(inCart ? "Retiré du panier" : "Ajouté au panier")
  }

  return (
    <Button
      type="button"
      size="icon"
      variant={inCart ? "default" : "secondary"}
      className={cn("h-8 w-8", inCart && "bg-secondary-600 text-white hover:bg-secondary-600/90", className)}
      onClick={handleClick}
      title={inCart ? "Retirer du panier" : "Ajouter au panier"}
    >
      {inCart ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
    </Button>
  )
}
