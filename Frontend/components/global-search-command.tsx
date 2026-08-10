"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import {
  Building2,
  ClipboardCheck,
  Compass,
  Handshake,
  Loader2,
  Search,
  UserRound,
} from "lucide-react"
import { globalSearch } from "@/actions/search"
import { PROPERTY_TYPE_LABELS, type GlobalSearchResults } from "@/lib/types"

const EMPTY_RESULTS: GlobalSearchResults = {
  properties: [],
  clients: [],
  bailleurs: [],
  commissionnaires: [],
  tasks: [],
}

// GOAL 18 — palette de recherche transverse (Ctrl/Cmd+K), interroge
// GET /api/search une seule fois par saisie (debounce 300ms), jamais de
// filtrage côté client sur un catalogue entier téléchargé d'avance.
export function GlobalSearchCommand() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GlobalSearchResults>(EMPTY_RESULTS)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults(EMPTY_RESULTS)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const timeout = setTimeout(() => {
      globalSearch(trimmed)
        .then(setResults)
        .catch(() => setResults(EMPTY_RESULTS))
        .finally(() => setIsLoading(false))
    }, 300)
    return () => clearTimeout(timeout)
  }, [query, open])

  const navigate = (href: string) => {
    setOpen(false)
    setQuery("")
    router.push(href)
  }

  const hasAnyResult =
    results.properties.length > 0 ||
    results.clients.length > 0 ||
    results.bailleurs.length > 0 ||
    results.commissionnaires.length > 0 ||
    results.tasks.length > 0

  return (
    <>
      <Button
        variant="outline"
        className="hidden sm:inline-flex items-center gap-2 text-muted-foreground w-64 justify-start"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        Rechercher...
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium">
          Ctrl K
        </kbd>
      </Button>
      <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setOpen(true)}>
        <Search className="h-5 w-5" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Recherche globale"
        description="Rechercher un bien, un client, un bailleur, un commissionnaire ou une tâche"
      >
        <CommandInput
          placeholder="Rechercher un bien, un client, une tâche..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : query.trim().length < 2 ? (
            <CommandEmpty>Tapez au moins 2 caractères pour rechercher.</CommandEmpty>
          ) : !hasAnyResult ? (
            <CommandEmpty>Aucun résultat pour « {query} ».</CommandEmpty>
          ) : (
            <>
              {results.properties.length > 0 && (
                <CommandGroup heading="Biens">
                  {results.properties.map((property) => (
                    <CommandItem
                      key={`property-${property.idProperty}`}
                      value={`property-${property.idProperty}-${property.quartier}-${property.avenue}`}
                      onSelect={() =>
                        navigate(
                          `/dashboard/${property.category === "RENT" ? "rentals" : "sales"}/${property.idProperty}`
                        )
                      }
                    >
                      <Building2 className="text-primary" />
                      <div className="min-w-0">
                        <p className="truncate">
                          {PROPERTY_TYPE_LABELS[property.propertyType]} — {property.quartier}
                        </p>
                        {property.avenue && (
                          <p className="truncate text-xs text-muted-foreground">{property.avenue}</p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {results.clients.length > 0 && (
                <CommandGroup heading="Clients">
                  {results.clients.map((client) => (
                    <CommandItem
                      key={`client-${client.idClient}`}
                      value={`client-${client.idClient}-${client.person?.fullName}`}
                      onSelect={() => navigate(`/dashboard/clients/${client.idClient}`)}
                    >
                      <UserRound className="text-primary" />
                      {client.person?.fullName || `Client #${client.idClient}`}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {results.bailleurs.length > 0 && (
                <CommandGroup heading="Bailleurs">
                  {results.bailleurs.map((bailleur) => (
                    <CommandItem
                      key={`bailleur-${bailleur.idBailleur}`}
                      value={`bailleur-${bailleur.idBailleur}-${bailleur.person?.fullName}`}
                      onSelect={() => navigate(`/dashboard/bailleurs/${bailleur.idBailleur}`)}
                    >
                      <Handshake className="text-primary" />
                      {bailleur.person?.fullName || `Bailleur #${bailleur.idBailleur}`}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {results.commissionnaires.length > 0 && (
                <CommandGroup heading="Commissionnaires">
                  {results.commissionnaires.map((commissionnaire) => (
                    <CommandItem
                      key={`commissionnaire-${commissionnaire.idCommissionnaire}`}
                      value={`commissionnaire-${commissionnaire.idCommissionnaire}-${commissionnaire.person?.fullName}`}
                      onSelect={() =>
                        navigate(`/dashboard/commissionnaires/${commissionnaire.idCommissionnaire}`)
                      }
                    >
                      <Compass className="text-primary" />
                      {commissionnaire.person?.fullName || commissionnaire.code} ({commissionnaire.code})
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {results.tasks.length > 0 && (
                <CommandGroup heading="Tâches">
                  {results.tasks.map((task) => (
                    <CommandItem
                      key={`task-${task.idTask}`}
                      value={`task-${task.idTask}-${task.title}`}
                      onSelect={() => navigate(`/dashboard/tasks/${task.idTask}`)}
                    >
                      <ClipboardCheck className="text-primary" />
                      {task.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
