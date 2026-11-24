"use client"

import { useEffect, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import api from "@/lib/axios"
import { apiErrorMessage } from "@/lib/apiError"
import type { Bailleur } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  selectedId: number | null
  onSelect: (bailleur: Bailleur) => void
}

// Recherche d'un bailleur existant par nom ou téléphone (version de
// l'agence du formulaire de collecte). Résultats limités par l'API aux
// rôles qui consultent les bailleurs.
export function BailleurPicker({ selectedId, onSelect }: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Bailleur[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setError("")
      return
    }
    setLoading(true)
    const timer = setTimeout(() => {
      api
        .get<{ data: Bailleur[] }>("/api/bailleurs", { params: { q } })
        .then((res) => {
          setResults(res.data.data.slice(0, 8))
          setError("")
        })
        .catch((err) => setError(apiErrorMessage(err, "Recherche impossible")))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom ou numéro de téléphone"
          className="pl-9"
          aria-label="Rechercher un bailleur"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>
      {error && <p className="text-sm text-error-500">{error}</p>}
      {results.length > 0 && (
        <ul className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-border p-1" role="listbox" aria-label="Bailleurs trouvés">
          {results.map((bailleur) => (
            <li key={bailleur.idBailleur}>
              <button
                type="button"
                role="option"
                aria-selected={selectedId === bailleur.idBailleur}
                onClick={() => onSelect(bailleur)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
                  selectedId === bailleur.idBailleur && "bg-muted"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{bailleur.person?.fullName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {bailleur.person?.phone || "Sans numéro"} · {bailleur.dossierNumber}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{bailleur.priorite}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && !loading && !error && results.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun bailleur trouvé : choisissez « Nouveau bailleur ».</p>
      )}
    </div>
  )
}
