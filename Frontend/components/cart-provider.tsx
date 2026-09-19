"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Property, ProposalTarget } from "@/lib/types"
import { getAppSettings } from "@/actions/appSettings"

// GOAL 5 — panier immobilier transversal (biens à louer, à vendre,
// favoris, recherche...). Persistant en localStorage : c'est une sélection
// de travail éphémère pour préparer un partage WhatsApp. Ce qui est tracé
// côté Backend, c'est l'envoi à un client (Proposal), pas le panier.
const STORAGE_KEY = "nbn-property-cart"
// Client pour lequel la sélection est préparée (« Proposer des biens »
// depuis sa fiche) — conservé si l'agent navigue entre les listes.
const TARGET_STORAGE_KEY = "nbn-proposal-target"
// GOAL 13 — valeur de repli si /api/settings est inaccessible (rôle sans
// settings:read, ou hors-ligne) ; la vraie limite vient de
// cart.maxItems, configurable depuis Paramètres.
const DEFAULT_MAX_ITEMS = 10

interface CartContextValue {
  items: Property[]
  addItem: (property: Property) => void
  removeItem: (idProperty: number) => void
  toggleItem: (property: Property) => void
  isInCart: (idProperty: number) => boolean
  clear: () => void
  maxItems: number
  proposalTarget: ProposalTarget | null
  setProposalTarget: (target: ProposalTarget | null) => void
}

const CartContext = createContext<CartContextValue | null>(null)

const readStorage = <T,>(key: string): T | null => {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    // Stockage corrompu/inaccessible : valeur vide par défaut.
    return null
  }
}

const writeStorage = (key: string, value: unknown) => {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Navigation privée / quota : la sélection reste utilisable en mémoire.
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Property[]>([])
  const [proposalTarget, setProposalTarget] = useState<ProposalTarget | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [maxItems, setMaxItems] = useState(DEFAULT_MAX_ITEMS)

  useEffect(() => {
    setItems(readStorage<Property[]>(STORAGE_KEY) ?? [])
    setProposalTarget(readStorage<ProposalTarget>(TARGET_STORAGE_KEY))
    setHydrated(true)
  }, [])

  useEffect(() => {
    getAppSettings()
      .then((settings) => {
        const setting = settings.find((s) => s.key === "cart.maxItems")
        if (typeof setting?.value === "number" && setting.value > 0) {
          setMaxItems(setting.value)
        }
      })
      .catch(() => {
        // Rôle sans settings:read, ou hors-ligne : DEFAULT_MAX_ITEMS reste actif.
      })
  }, [])

  useEffect(() => {
    if (!hydrated) return
    writeStorage(STORAGE_KEY, items)
  }, [items, hydrated])

  useEffect(() => {
    if (!hydrated) return
    writeStorage(TARGET_STORAGE_KEY, proposalTarget)
  }, [proposalTarget, hydrated])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem: (property) => {
        setItems((prev) => {
          if (prev.some((p) => p.idProperty === property.idProperty)) return prev
          if (prev.length >= maxItems) return prev
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
          if (prev.length >= maxItems) return prev
          return [...prev, property]
        })
      },
      isInCart: (idProperty) => items.some((p) => p.idProperty === idProperty),
      clear: () => setItems([]),
      maxItems,
      proposalTarget,
      setProposalTarget,
    }),
    [items, maxItems, proposalTarget]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart doit être utilisé dans un CartProvider")
  return ctx
}
