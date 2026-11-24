"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Camera, FileText, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"

// Même règle que le Backend (fiche commissionnaire) : JPG, PNG ou PDF,
// 5 Mo maximum par fichier. Le contenu réel est revérifié côté serveur.
export const ID_DOCUMENT_ACCEPT = "image/jpeg,image/png,application/pdf"
export const ID_DOCUMENT_MAX_MB = 5

export const checkIdDocumentFile = (file: File, maxMb = ID_DOCUMENT_MAX_MB): string | null => {
  if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
    return "Format non accepté : JPG, PNG ou PDF uniquement."
  }
  if (file.size > maxMb * 1024 * 1024) return `Le fichier dépasse ${maxMb} Mo.`
  return null
}

type Props = {
  label: string
  required?: boolean
  file: File | null
  onChange: (file: File | null) => void
  maxMb?: number
}

/**
 * Une face de pièce d'identité : photo directe (téléphone) ou fichier,
 * miniature et bouton de suppression avant l'envoi.
 */
export function IdDocumentPicker({ label, required, file, onChange, maxMb = ID_DOCUMENT_MAX_MB }: Props) {
  const id = useId()
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!file || file.type === "application/pdf") {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const pick = (selected?: File | null) => {
    if (!selected) return
    const problem = checkIdDocumentFile(selected, maxMb)
    setError(problem ?? "")
    onChange(problem ? null : selected)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium" id={`${id}-label`}>
        {label}
        {required && <span className="text-error-500"> *</span>}
      </p>

      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-border p-2">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={`Aperçu : ${label}`} className="h-14 w-20 rounded object-cover" />
          ) : (
            <span className="flex h-14 w-20 items-center justify-center rounded bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" aria-hidden />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              onChange(null)
              setError("")
            }}
            aria-label={`Retirer ${label.toLowerCase()}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${id}-label`}>
          <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()}>
            <Camera className="mr-2 h-4 w-4" aria-hidden />
            Prendre une photo
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" aria-hidden />
            Choisir un fichier
          </Button>
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ""
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept={ID_DOCUMENT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ""
        }}
      />
      <p className="text-xs text-muted-foreground">JPG, PNG ou PDF, {maxMb} Mo maximum.</p>
      {error && (
        <p role="alert" className="text-sm text-error-500">
          {error}
        </p>
      )}
    </div>
  )
}
