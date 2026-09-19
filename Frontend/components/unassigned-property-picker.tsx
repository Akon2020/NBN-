"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Loader2, Search } from "lucide-react"
import { getAllProperties } from "@/actions/properties"
import { getImageUrl } from "@/lib/imageUrl"
import { PROPERTY_TYPE_LABELS, type Property } from "@/lib/types"

// Biens de la galerie encore sans bailleur, à rattacher. Le Backend refuse de
// toute façon un bien déjà attribué : ce filtre évite seulement de le proposer.
export function UnassignedPropertyPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: number[]
  onChange: (ids: number[]) => void
}) {
  const [properties, setProperties] = useState<Property[] | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    getAllProperties()
      .then((all) => setProperties(all.filter((property) => !property.idBailleur)))
      .catch(() => setProperties([]))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (properties ?? []).filter(
      (p) =>
        !q ||
        [p.quartier, p.avenue, PROPERTY_TYPE_LABELS[p.propertyType]].some((value) =>
          (value || "").toLowerCase().includes(q)
        )
    )
  }, [properties, search])

  if (properties === null) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Quartier, avenue, type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-2">
        {filtered.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">Aucun bien sans bailleur.</p>
        ) : (
          filtered.map((property) => {
            const checked = selectedIds.includes(property.idProperty)
            return (
              <label
                key={property.idProperty}
                className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-muted"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) =>
                    onChange(
                      value === true
                        ? [...selectedIds, property.idProperty]
                        : selectedIds.filter((id) => id !== property.idProperty)
                    )
                  }
                />
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                  <Image src={getImageUrl(property.images?.[0]?.image)} alt="" fill sizes="40px" className="object-cover" />
                </div>
                <span className="min-w-0 text-sm">
                  <span className="block truncate font-medium">
                    {PROPERTY_TYPE_LABELS[property.propertyType]} {property.category === "SALE" ? "à vendre" : "à louer"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[property.avenue, property.quartier].filter(Boolean).join(", ")} · $
                    {Number(property.price).toLocaleString("fr-FR")}
                  </span>
                </span>
              </label>
            )
          })
        )}
      </div>
      {selectedIds.length > 0 && <p className="text-xs text-muted-foreground">{selectedIds.length} bien(s) sélectionné(s)</p>}
    </div>
  )
}
