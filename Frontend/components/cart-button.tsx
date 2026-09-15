"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Send, ShoppingBag, Trash2, UserRound, X } from "lucide-react"
import Image from "next/image"
import { useCart } from "@/components/cart-provider"
import { WhatsAppProposalDialog } from "@/components/whatsapp-proposal-dialog"
import { getImageUrl } from "@/lib/imageUrl"
import { PROPERTY_TYPE_LABELS } from "@/lib/types"
import { whatsAppNumberOf } from "@/lib/clientContact"
import { formatPropertyPrice } from "@/lib/whatsappProposal"

// GOAL 5 — point d'entrée du panier depuis n'importe quelle page du
// dashboard (monté une seule fois dans le layout, cf. dashboard/layout.tsx).
// L'envoi part bien par bien, chacun avec sa photo (WhatsAppProposalDialog) ;
// quand la sélection est préparée pour un client (« Proposer des biens »),
// les biens envoyés sont tracés comme propositions.
export function CartButton() {
  const { items, removeItem, clear, maxItems, proposalTarget, setProposalTarget } = useCart()
  const [open, setOpen] = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)

  const clientNumber = whatsAppNumberOf(proposalTarget?.phone)

  const handleFinished = (sentIds: number[]) => {
    if (!proposalTarget || sentIds.length === 0) return
    sentIds.forEach(removeItem)
    if (sentIds.length === items.length) {
      setProposalTarget(null)
      setOpen(false)
    }
  }

  return (
    <>
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

          {proposalTarget && (
            <div className="flex items-start gap-3 border-b border-border bg-muted/50 px-4 py-3">
              <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1 text-sm">
                <p>
                  Sélection pour{" "}
                  <Link href={`/dashboard/clients/${proposalTarget.idClient}`} className="font-semibold hover:underline">
                    {proposalTarget.fullName}
                  </Link>
                </p>
                {!clientNumber && (
                  <p className="text-xs text-muted-foreground">
                    Aucun numéro WhatsApp valide sur la fiche : choisissez le contact au moment du partage.
                  </p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                title="Ne plus préparer pour ce client"
                onClick={() => setProposalTarget(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun bien sélectionné pour l&apos;instant. Ajoutez des biens depuis les listes
                (galerie, location, vente, recherche, favoris) via l&apos;icône panier.
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
                    <p className="text-xs text-muted-foreground">{formatPropertyPrice(property)}</p>
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
              <Button
                className="w-full gap-2 bg-secondary-600 text-white hover:bg-secondary-600/90"
                onClick={() => setProposalOpen(true)}
              >
                <Send className="h-4 w-4" />
                {proposalTarget ? `Envoyer à ${proposalTarget.fullName} sur WhatsApp` : "Partager via WhatsApp"}
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={clear}>
                <Trash2 className="h-4 w-4" />
                Vider le panier
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <WhatsAppProposalDialog
        open={proposalOpen}
        onOpenChange={setProposalOpen}
        properties={items}
        target={proposalTarget}
        onFinished={handleFinished}
      />
    </>
  )
}
