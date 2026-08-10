"use client"

import type React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

// Kit de champs partagé par les formulaires longs (demande de location,
// collecte de bien). Objectif assumé : réduire le nombre d'interactions
// nécessaires — des pastilles cliquables plutôt que des menus déroulants
// (un tap au lieu de trois), et le champ « Autre » qui n'apparaît que
// lorsqu'il est réellement choisi.

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required ? (
          <span className="text-destructive ml-0.5">*</span>
        ) : (
          <span className="text-muted-foreground font-normal ml-1.5 text-xs">(optionnel)</span>
        )}
      </Label>
      {hint && <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>}
      {children}
    </div>
  )
}

export interface Choice {
  value: string
  label: string
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-4 py-2.5 text-sm transition-colors",
        active
          ? "border-primary-900 bg-primary-900 text-white font-medium"
          : "border-border bg-background text-foreground hover:border-primary-900/40"
      )}
    >
      {children}
    </button>
  )
}

// Sélection unique. `otherValue` désigne l'option qui déverrouille le
// champ libre (souvent "AUTRE") — jamais un champ libre affiché en
// permanence « au cas où ».
export function ChoiceChips({
  choices,
  value,
  onChange,
  otherValue,
  otherText,
  onOtherTextChange,
  otherPlaceholder = "Précisez...",
}: {
  choices: Choice[]
  value: string
  onChange: (value: string) => void
  otherValue?: string
  otherText?: string
  onOtherTextChange?: (value: string) => void
  otherPlaceholder?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <Chip
            key={choice.value}
            active={value === choice.value}
            // Re-cliquer sur le choix actif le désélectionne : sans ça,
            // un champ optionnel devient irréversible dès le premier tap.
            onClick={() => onChange(value === choice.value ? "" : choice.value)}
          >
            {choice.label}
          </Chip>
        ))}
      </div>
      {otherValue && value === otherValue && onOtherTextChange && (
        <Input
          value={otherText || ""}
          onChange={(e) => onOtherTextChange(e.target.value)}
          placeholder={otherPlaceholder}
        />
      )}
    </div>
  )
}

export function MultiChoiceChips({
  choices,
  values,
  onChange,
  otherValue,
  otherText,
  onOtherTextChange,
  otherPlaceholder = "Précisez...",
}: {
  choices: Choice[]
  values: string[]
  onChange: (values: string[]) => void
  otherValue?: string
  otherText?: string
  onOtherTextChange?: (value: string) => void
  otherPlaceholder?: string
}) {
  const toggle = (value: string) =>
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <Chip key={choice.value} active={values.includes(choice.value)} onClick={() => toggle(choice.value)}>
            {choice.label}
          </Chip>
        ))}
      </div>
      {otherValue && values.includes(otherValue) && onOtherTextChange && (
        <Input
          value={otherText || ""}
          onChange={(e) => onOtherTextChange(e.target.value)}
          placeholder={otherPlaceholder}
        />
      )}
    </div>
  )
}

export function TextField({
  value,
  onChange,
  ...props
}: {
  value: string
  onChange: (value: string) => void
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  return <Input value={value} onChange={(e) => onChange(e.target.value)} {...props} />
}

export function TextAreaField({
  value,
  onChange,
  ...props
}: {
  value: string
  onChange: (value: string) => void
} & Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange">) {
  return <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} {...props} />
}
