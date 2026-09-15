"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { UnassignedPropertyPicker } from "@/components/unassigned-property-picker"
import { linkBailleurProperties } from "@/actions/bailleurs"
import type { Bailleur } from "@/lib/types"
import { toast } from "sonner"

// « Joindre un bien existant » depuis le profil d'un bailleur.
export function BailleurLinkPropertiesDialog({
  bailleur,
  open,
  onOpenChange,
  onLinked,
}: {
  bailleur: Bailleur
  open: boolean
  onOpenChange: (open: boolean) => void
  onLinked: () => void
}) {
  const [idProperties, setIdProperties] = useState<number[]>([])
  const [isLinking, setIsLinking] = useState(false)

  const handleLink = async () => {
    setIsLinking(true)
    try {
      const linked = await linkBailleurProperties(bailleur.idBailleur, idProperties)
      toast.success(`${linked} bien(s) rattaché(s) à ${bailleur.person?.fullName}`)
      setIdProperties([])
      onOpenChange(false)
      onLinked()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLinking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Joindre un bien existant</DialogTitle>
          <DialogDescription>Biens de la galerie sans bailleur, à rattacher à {bailleur.person?.fullName}.</DialogDescription>
        </DialogHeader>
        {open && <UnassignedPropertyPicker selectedIds={idProperties} onChange={setIdProperties} />}
        <DialogFooter>
          <Button
            onClick={handleLink}
            disabled={isLinking || idProperties.length === 0}
            className="w-full bg-accent-600 text-white hover:bg-accent-600/90 sm:w-auto"
          >
            {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rattacher {idProperties.length > 0 ? `(${idProperties.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
