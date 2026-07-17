"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageIcon, Loader2, Trash2, Upload, Video as VideoIcon, X, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import type { Property, PropertyImageEntry, PropertyVideoEntry } from "@/lib/types"
import { getImageUrl } from "@/lib/imageUrl"
import {
  addPropertyImages,
  addPropertyVideos,
  deletePropertyImage,
  deletePropertyVideo,
  getSingleProperty,
  reorderPropertyImages,
  reorderPropertyVideos,
} from "@/actions/properties"

const MAX_IMAGE_MB = 5
const MAX_VIDEO_MB = 50
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"]

interface PendingFile {
  file: File
  previewUrl: string
}

interface PropertyMediaManagerProps {
  property: Property
  onChanged: (updated: Property) => void
}

// GOAL 2 — galerie photo/vidéo : prévisualisation avant envoi, validation
// client (format/taille, en plus de la validation Backend faisant foi),
// suppression et réorganisation (flèches — pas de drag-and-drop pour
// éviter une dépendance supplémentaire uniquement pour ce module).
export function PropertyMediaManager({ property, onChanged }: PropertyMediaManagerProps) {
  const [pendingImages, setPendingImages] = useState<PendingFile[]>([])
  const [pendingVideos, setPendingVideos] = useState<PendingFile[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadingVideos, setUploadingVideos] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const images = property.images || []
  const videos = property.videos || []

  const validateFiles = (files: FileList, allowedTypes: string[], maxMb: number) => {
    const valid: File[] = []
    Array.from(files).forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Format non autorisé : ${file.name}`)
        return
      }
      if (file.size > maxMb * 1024 * 1024) {
        toast.error(`${file.name} dépasse la taille maximale (${maxMb} Mo)`)
        return
      }
      valid.push(file)
    })
    return valid
  }

  const handleSelectImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const valid = validateFiles(e.target.files, IMAGE_TYPES, MAX_IMAGE_MB)
    setPendingImages((prev) => [
      ...prev,
      ...valid.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ])
    e.target.value = ""
  }

  const handleSelectVideos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const valid = validateFiles(e.target.files, VIDEO_TYPES, MAX_VIDEO_MB)
    setPendingVideos((prev) => [
      ...prev,
      ...valid.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ])
    e.target.value = ""
  }

  const removePending = (list: "image" | "video", index: number) => {
    if (list === "image") {
      setPendingImages((prev) => prev.filter((_, i) => i !== index))
    } else {
      setPendingVideos((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const uploadImages = async () => {
    if (!pendingImages.length) return
    setUploadingImages(true)
    try {
      await addPropertyImages(property.idProperty, pendingImages.map((p) => p.file))
      pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      setPendingImages([])
      onChanged(await getSingleProperty(property.idProperty))
      toast.success("Images ajoutées avec succès")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setUploadingImages(false)
    }
  }

  const uploadVideos = async () => {
    if (!pendingVideos.length) return
    setUploadingVideos(true)
    try {
      await addPropertyVideos(property.idProperty, pendingVideos.map((p) => p.file))
      pendingVideos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      setPendingVideos([])
      onChanged(await getSingleProperty(property.idProperty))
      toast.success("Vidéos ajoutées avec succès")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setUploadingVideos(false)
    }
  }

  const handleDeleteImage = async (image: PropertyImageEntry) => {
    try {
      await deletePropertyImage(property.idProperty, image.idPropertyImage)
      onChanged({ ...property, images: images.filter((i) => i.idPropertyImage !== image.idPropertyImage) })
      toast.success("Image supprimée")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  const handleDeleteVideo = async (video: PropertyVideoEntry) => {
    try {
      await deletePropertyVideo(property.idProperty, video.idPropertyVideo)
      onChanged({ ...property, videos: videos.filter((v) => v.idPropertyVideo !== video.idPropertyVideo) })
      toast.success("Vidéo supprimée")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  const moveImage = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= images.length) return
    const reordered = [...images]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    onChanged({ ...property, images: reordered })
    try {
      await reorderPropertyImages(
        property.idProperty,
        reordered.map((i) => i.idPropertyImage)
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  const moveVideo = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= videos.length) return
    const reordered = [...videos]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    onChanged({ ...property, videos: reordered })
    try {
      await reorderPropertyVideos(
        property.idProperty,
        reordered.map((v) => v.idPropertyVideo)
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue")
    }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Photos et vidéos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Images */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-sm font-semibold">Images ({images.length})</h4>
            <input
              ref={imageInputRef}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              multiple
              className="hidden"
              onChange={handleSelectImages}
            />
            <Button size="sm" variant="outline" onClick={() => imageInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" />
              Ajouter des images
            </Button>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map((image, index) => (
                <div key={image.idPropertyImage} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                  <Image src={getImageUrl(image.image)} alt="" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => moveImage(index, -1)} disabled={index === 0}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => handleDeleteImage(image)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingImages.length > 0 && (
            <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
              <p className="text-xs text-muted-foreground">Aperçu avant envoi :</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {pendingImages.map((p, index) => (
                  <div key={p.previewUrl} className="relative aspect-square rounded-md overflow-hidden border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:), jamais optimisable/servi par next/image */}
                    <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePending("image", index)}
                      className="absolute top-1 right-1 rounded-full bg-black/60 p-1"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
              <Button size="sm" onClick={uploadImages} disabled={uploadingImages} className="w-full sm:w-auto">
                {uploadingImages ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Envoyer {pendingImages.length} image(s)
              </Button>
            </div>
          )}
        </div>

        {/* Videos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-sm font-semibold">Vidéos ({videos.length})</h4>
            <input
              ref={videoInputRef}
              type="file"
              accept={VIDEO_TYPES.join(",")}
              multiple
              className="hidden"
              onChange={handleSelectVideos}
            />
            <Button size="sm" variant="outline" onClick={() => videoInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" />
              Ajouter des vidéos
            </Button>
          </div>

          {videos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {videos.map((video, index) => (
                <div key={video.idPropertyVideo} className="relative rounded-lg overflow-hidden border border-border">
                  <video src={getImageUrl(video.video)} controls className="w-full aspect-video bg-black" />
                  <div className="flex items-center justify-end gap-1 p-2 bg-muted/50">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => moveVideo(index, -1)} disabled={index === 0}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => handleDeleteVideo(video)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => moveVideo(index, 1)} disabled={index === videos.length - 1}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingVideos.length > 0 && (
            <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
              <p className="text-xs text-muted-foreground">Aperçu avant envoi :</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pendingVideos.map((p, index) => (
                  <div key={p.previewUrl} className="relative rounded-md overflow-hidden border border-border">
                    <video src={p.previewUrl} controls className="w-full aspect-video bg-black" />
                    <button
                      type="button"
                      onClick={() => removePending("video", index)}
                      className="absolute top-1 right-1 rounded-full bg-black/60 p-1"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
              <Button size="sm" onClick={uploadVideos} disabled={uploadingVideos} className="w-full sm:w-auto">
                {uploadingVideos ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <VideoIcon className="h-4 w-4 mr-1" />
                )}
                Envoyer {pendingVideos.length} vidéo(s)
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
