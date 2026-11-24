"use client"

import { useEffect, useState } from "react"
import { Columns3, List } from "lucide-react"
import { cn } from "@/lib/utils"

export type ViewMode = "kanban" | "list"

// Choix Kanban / Liste mémorisé sur l'appareil, par page. Sur téléphone, la
// liste est proposée par défaut : un Kanban se lit mal sur un écran étroit.
export function useViewMode(storageKey: string): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>("kanban")

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (saved === "kanban" || saved === "list") {
        setMode(saved)
        return
      }
    } catch {
      // Stockage indisponible : choix par défaut.
    }
    if (window.matchMedia("(max-width: 639px)").matches) setMode("list")
  }, [storageKey])

  const update = (next: ViewMode) => {
    setMode(next)
    try {
      window.localStorage.setItem(storageKey, next)
    } catch {
      // Le choix vaut alors pour cette visite seulement.
    }
  }

  return [mode, update]
}

type Props = { value: ViewMode; onChange: (mode: ViewMode) => void }

export function ViewModeToggle({ value, onChange }: Props) {
  const options: { mode: ViewMode; label: string; icon: typeof List }[] = [
    { mode: "kanban", label: "Kanban", icon: Columns3 },
    { mode: "list", label: "Liste", icon: List },
  ]
  return (
    <div role="radiogroup" aria-label="Affichage" className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
      {options.map((option) => (
        <button
          key={option.mode}
          type="button"
          role="radio"
          aria-checked={value === option.mode}
          onClick={() => onChange(option.mode)}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
            value === option.mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <option.icon className="h-4 w-4" aria-hidden />
          {option.label}
        </button>
      ))}
    </div>
  )
}
