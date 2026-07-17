"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Property } from "@/lib/types"

// GOAL 5 — panier immobilier transversal (biens à louer, à vendre,
// favoris, recherche...). Volontairement Frontend-only et persistant en
// localStorage : c'est une sélection de travail éphémère pour préparer un
// partage WhatsApp, jamais une entité métier — rien à tracer côté
// Backend, pas de permission à vérifier.
const STORAGE_KEY = "nbn-property-cart"
const MAX_ITEMS = 10

interface CartContextValue {
  items: Property[]
  addItem: (property: Property) => void
  removeItem: (idProperty: number) => void
  toggleItem: (property: Property) => void
  isInCart: (idProperty: number) => boolean
  clear: () => void
  maxItems: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Property[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {
      // Panier vide par défaut si le stockage local est corrompu/inaccessible.
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, hydrated])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem: (property) => {
        setItems((prev) => {
          if (prev.some((p) => p.idProperty === property.idProperty)) return prev
          if (prev.length >= MAX_ITEMS) return prev
          return [...prev, property]
        })
      },
      removeItem: (idProperty) => {
        setItems((prev) => prev.filter((p) => p.idProperty !== idProperty))
      },
      toggleItem: (property) => {
        setItems((prev) => {
          if (prev.some((p) => p.idProperty === property.idProperty)) {
            return prev.filter((p) => p.idProperty !== property.idProperty)
          }
          if (prev.length >= MAX_ITEMS) return prev
          return [...prev, property]
        })
      },
      isInCart: (idProperty) => items.some((p) => p.idProperty === idProperty),
      clear: () => setItems([]),
      maxItems: MAX_ITEMS,
    }),
    [items]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart doit être utilisé dans un CartProvider")
  return ctx
}
