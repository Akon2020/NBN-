"use client"

import { useRef, useState } from "react"
import { Camera, Loader2 } from "lucide-react"
import { BailleurAvatar } from "@/components/bailleur-avatar"
import { uploadBailleurPhoto } from "@/actions/bailleurs"
import type { Bailleur } from "@/lib/types"
import { toast } from "sonner"

// Photo du profil : un tap sur l'avatar ouvre la galerie ou l'appareil photo.
export function BailleurPhotoUploader({
  bailleur,
  onUploaded,
}: {
  bailleur: Bailleur
  onUploaded: (photo: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFile = async (file?: File) => {
    if (!file) return
    setIsUploading(true)
    try {
      onUploaded(await uploadBailleurPhoto(bailleur.idBailleur, file))
      toast.success("Photo mise à jour")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="group relative shrink-0 rounded-full"
      title="Changer la photo"
      disabled={isUploading}
    >
      <BailleurAvatar photo={bailleur.photo} fullName={bailleur.person?.fullName} className="h-20 w-20" />
      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
        {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </button>
  )
}
