"use client"

import { ChoiceChips, Field, MultiChoiceChips } from "@/components/forms/form-fields"
import { AUTRE_AVENUE, avenuesOf, quartiersOf, toChoices } from "@/lib/locations"
import { COMMUNE_CHOICES } from "@/lib/types"

// Commune → quartier → avenue(s), en cascade depuis le référentiel de
// l'agence. Changer de commune vide le quartier, changer de quartier vide
// les avenues : jamais un quartier d'Ibanda resté sélectionné sous Kadutu.
export interface LocationValue {
  commune: string
  quartier: string
  avenues: string[]
  avenueAutre: string
}

export function LocationFields({
  value,
  onChange,
  multipleAvenues = false,
  required = false,
  avenueLabel,
}: {
  value: LocationValue
  onChange: (value: LocationValue) => void
  multipleAvenues?: boolean
  required?: boolean
  avenueLabel?: string
}) {
  const quartiers = quartiersOf(value.commune)
  const avenueChoices = [
    ...toChoices(avenuesOf(value.commune, value.quartier)),
    { value: AUTRE_AVENUE, label: "Autre avenue" },
  ]

  return (
    <div className="space-y-5">
      <Field label="Commune" required={required}>
        <ChoiceChips
          choices={COMMUNE_CHOICES}
          value={value.commune}
          onChange={(commune) => onChange({ commune, quartier: "", avenues: [], avenueAutre: "" })}
        />
      </Field>

      {value.commune && (
        <Field label="Quartier" required={required}>
          <ChoiceChips
            choices={toChoices(quartiers)}
            value={value.quartier}
            onChange={(quartier) => onChange({ ...value, quartier, avenues: [], avenueAutre: "" })}
          />
        </Field>
      )}

      {value.quartier && (
        <Field
          label={avenueLabel ?? (multipleAvenues ? "Avenue(s)" : "Avenue")}
          hint={multipleAvenues ? "Vous pouvez en choisir plusieurs." : undefined}
          required={required}
        >
          {multipleAvenues ? (
            <MultiChoiceChips
              choices={avenueChoices}
              values={value.avenues}
              onChange={(avenues) => onChange({ ...value, avenues })}
              otherValue={AUTRE_AVENUE}
              otherText={value.avenueAutre}
              onOtherTextChange={(avenueAutre) => onChange({ ...value, avenueAutre })}
              otherPlaceholder="Nom de l'avenue ou repère connu"
            />
          ) : (
            <ChoiceChips
              choices={avenueChoices}
              value={value.avenues[0] ?? ""}
              onChange={(avenue) => onChange({ ...value, avenues: avenue ? [avenue] : [] })}
              otherValue={AUTRE_AVENUE}
              otherText={value.avenueAutre}
              onOtherTextChange={(avenueAutre) => onChange({ ...value, avenueAutre })}
              otherPlaceholder="Nom de l'avenue ou repère connu"
            />
          )}
        </Field>
      )}
    </div>
  )
}

// Avenues réellement retenues : les avenues cochées, « Autre » remplacée
// par le texte saisi.
export const resolveAvenues = (value: LocationValue): string[] =>
  value.avenues.flatMap((avenue) =>
    avenue === AUTRE_AVENUE ? (value.avenueAutre.trim() ? [value.avenueAutre.trim()] : []) : [avenue]
  )

// Message d'erreur de l'étape, `null` si la localisation est complète.
export const validateLocation = (value: LocationValue): string | null => {
  if (!value.commune) return "Choisissez la commune."
  if (!value.quartier) return "Choisissez le quartier."
  if (resolveAvenues(value).length === 0) {
    return value.avenues.includes(AUTRE_AVENUE)
      ? "Précisez le nom de l'avenue."
      : "Choisissez au moins une avenue."
  }
  return null
}
