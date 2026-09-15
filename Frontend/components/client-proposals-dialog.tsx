"use client"

import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { getImageUrl } from "@/lib/imageUrl"
import {
  PROPERTY_STATUT_LABELS,
  PROPERTY_TYPE_LABELS,
  PROPOSAL_CHANNEL_LABELS,
  type SentProposal,
} from "@/lib/types"

// « Propositions envoyées » : chaque bien proposé au client, avec ses
// détails, la date, le canal et l'agent qui l'a envoyé.
export function ClientProposalsDialog({
  clientName,
  proposals,
  isLoading,
  open,
  onOpenChange,
}: {
  clientName?: string
  proposals: SentProposal[]
  isLoading: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Propositions envoyées ({proposals.length})</DialogTitle>
          <DialogDescription>Biens proposés à {clientName}, les plus récents d&apos;abord.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : proposals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucune proposition envoyée pour l&apos;instant.</p>
        ) : (
          <div className="space-y-3 py-2">
            {proposals.map((proposal) => {
              const property = proposal.property
              const href = property
                ? `/dashboard/${property.category === "SALE" ? "sales" : "rentals"}/${property.idProperty}`
                : undefined
              const composition = property
                ? [
                    property.bedrooms ? `${property.bedrooms} ch.` : null,
                    property.livingRooms ? `${property.livingRooms} salon(s)` : null,
                    property.toilets ? `${property.toilets} sdb` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : ""

              return (
                <div key={proposal.idProposal} className="flex gap-3 rounded-lg border border-border p-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image src={getImageUrl(property?.images?.[0]?.image)} alt="" fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {href ? (
                        <Link href={href} className="font-medium hover:underline">
                          {property ? PROPERTY_TYPE_LABELS[property.propertyType] : "Bien"}
                          {property?.category === "SALE" ? " à vendre" : " à louer"}
                        </Link>
                      ) : (
                        <span className="font-medium">Bien retiré</span>
                      )}
                      {property && (
                        <span className="text-sm font-semibold">
                          ${Number(property.price).toLocaleString("fr-FR")}
                          {property.category === "RENT" ? "/mois" : ""}
                        </span>
                      )}
                    </div>
                    {property && (
                      <p className="text-sm text-muted-foreground">
                        {[property.avenue, property.quartier, property.commune].filter(Boolean).join(", ")}
                        {composition ? ` — ${composition}` : ""}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(proposal.sentAt).toLocaleString("fr-FR")}</span>
                      {proposal.channel && <Badge variant="outline">{PROPOSAL_CHANNEL_LABELS[proposal.channel]}</Badge>}
                      {proposal.sender && <span>par {proposal.sender.fullName}</span>}
                      {property && <Badge variant="secondary">{PROPERTY_STATUT_LABELS[property.statut]}</Badge>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
