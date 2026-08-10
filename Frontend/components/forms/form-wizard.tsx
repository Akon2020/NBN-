"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface WizardStep {
  id: string
  title: string
  subtitle?: string
  content: React.ReactNode
  // Message d'erreur si l'étape est incomplète, `null` si elle peut être
  // validée. Renvoyer `null` par défaut : dans ces formulaires la quasi
  // totalité des champs est optionnelle, seul l'essentiel bloque.
  validate?: () => string | null
}

// Wizard générique pour les formulaires longs. Trois choix qui répondent
// directement au « c'est kilométrique » :
//  1. une section à la fois, avec une barre de progression réelle ;
//  2. brouillon sauvegardé automatiquement (une fermeture d'onglet ou un
//     rechargement ne fait jamais perdre la saisie) ;
//  3. la validation ne bloque que sur l'étape courante, jamais un mur
//     d'erreurs à la fin.
export function FormWizard({
  steps,
  onSubmit,
  submitLabel = "Envoyer",
  isSubmitting = false,
  draftKey,
  onClearDraft,
}: {
  steps: WizardStep[]
  onSubmit: () => void
  submitLabel?: string
  isSubmitting?: boolean
  draftKey?: string
  onClearDraft?: () => void
}) {
  const [current, setCurrent] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const step = steps[current]
  const isLast = current === steps.length - 1
  const progress = ((current + 1) / steps.length) * 100

  useEffect(() => {
    setError(null)
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }, [current])

  const goNext = () => {
    const message = step.validate?.() ?? null
    if (message) {
      setError(message)
      return
    }
    if (isLast) {
      onSubmit()
      return
    }
    setCurrent((c) => c + 1)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            Étape {current + 1} sur {steps.length}
          </span>
          <span className="text-muted-foreground">{Math.round(progress)} %</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {steps.map((s, index) => (
            <button
              key={s.id}
              type="button"
              // Revenir en arrière librement, avancer uniquement par le
              // bouton (pour que la validation d'étape reste effective).
              onClick={() => index < current && setCurrent(index)}
              disabled={index > current}
              className={cn(
                "h-1.5 flex-1 min-w-6 rounded-full transition-colors",
                index < current
                  ? "bg-secondary-600 cursor-pointer"
                  : index === current
                    ? "bg-accent-600"
                    : "bg-muted"
              )}
              aria-label={`Étape ${index + 1} : ${s.title}`}
            />
          ))}
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-5 sm:p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-balance">
              {step.title}
            </h2>
            {step.subtitle && (
              <p className="text-sm text-muted-foreground leading-relaxed">{step.subtitle}</p>
            )}
          </div>

          {step.content}

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        {current > 0 && (
          <Button type="button" variant="outline" onClick={() => setCurrent((c) => c - 1)} className="h-12">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        )}
        <Button
          type="button"
          onClick={goNext}
          disabled={isSubmitting}
          className="h-12 flex-1 bg-accent-600 text-white hover:bg-accent-600/90"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Envoi en cours...
            </>
          ) : isLast ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              {submitLabel}
            </>
          ) : (
            <>
              Continuer
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {draftKey && onClearDraft && (
        <p className="text-center text-xs text-muted-foreground">
          Vos réponses sont enregistrées sur cet appareil.{" "}
          <button type="button" onClick={onClearDraft} className="underline hover:text-foreground">
            Tout effacer
          </button>
        </p>
      )}
    </div>
  )
}

// Persistance locale du brouillon — volontairement dans le navigateur
// uniquement : une demande incomplète n'a rien à faire côté serveur tant
// que le client ne l'a pas soumise (et les conditions pas acceptées).
export function useFormDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial)
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) setValue({ ...initial, ...JSON.parse(raw) })
    } catch {
      // Brouillon illisible (format changé, quota) : on repart du vide
      // plutôt que de bloquer le formulaire.
    }
    setRestored(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    if (!restored) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Stockage plein/refusé : la saisie en cours reste utilisable.
    }
  }, [key, value, restored])

  const clear = () => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Idem.
    }
    setValue(initial)
  }

  return { value, setValue, clear, restored }
}
