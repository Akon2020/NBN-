"use client"

import { useState } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { ImageIcon, PlayCircle, Video as VideoIcon } from "lucide-react"
import { getImageUrl } from "@/lib/imageUrl"
import type { PropertyImageEntry, PropertyVideoEntry } from "@/lib/types"
import { cn } from "@/lib/utils"

type Tab = "photos" | "videos"

// Médias sur la fiche d'un bien : sélecteur Photos / Vidéos. Les vidéos
// étaient enregistrées mais jamais affichées sur la fiche.
export function PropertyMediaViewer({
  images,
  videos,
}: {
  images: PropertyImageEntry[]
  videos: PropertyVideoEntry[]
}) {
  const [tab, setTab] = useState<Tab>(images.length > 0 || videos.length === 0 ? "photos" : "videos")
  const [imageIndex, setImageIndex] = useState(0)
  const [videoIndex, setVideoIndex] = useState(0)

  const tabButton = (value: Tab, label: string, count: number, Icon: typeof ImageIcon) => (
    <button
      type="button"
      onClick={() => setTab(value)}
      aria-pressed={tab === value}
      className={cn(
        "flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
        tab === value ? "bg-primary-900 text-white" : "text-muted-foreground hover:bg-muted"
      )}
    >
      <Icon className="h-4 w-4" />
      {label} ({count})
    </button>
  )

  return (
    <Card className="border-border overflow-hidden">
      {videos.length > 0 && (
        <div className="flex gap-2 border-b border-border p-2">
          {tabButton("photos", "Photos", images.length, ImageIcon)}
          {tabButton("videos", "Vidéos", videos.length, VideoIcon)}
        </div>
      )}

      {tab === "photos" ? (
        <>
          <div className="relative aspect-video bg-muted">
            {images.length > 0 ? (
              <Image
                src={getImageUrl(images[imageIndex]?.image)}
                alt={`Image ${imageIndex + 1} du bien`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Aucune image disponible</p>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-4">
              {images.map((image, index) => (
                <button
                  key={image.idPropertyImage}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  className={cn(
                    "relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border-2",
                    imageIndex === index ? "border-primary" : "border-border"
                  )}
                >
                  <Image src={getImageUrl(image.image)} alt={`Miniature ${index + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="aspect-video bg-black">
            {/* preload="metadata" : seule la première image se charge tant que
                la lecture n'est pas lancée (connexion faible). */}
            <video
              key={videos[videoIndex]?.idPropertyVideo}
              src={getImageUrl(videos[videoIndex]?.video)}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full"
            />
          </div>
          {videos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-4">
              {videos.map((video, index) => (
                <button
                  key={video.idPropertyVideo}
                  type="button"
                  onClick={() => setVideoIndex(index)}
                  className={cn(
                    "flex h-14 flex-shrink-0 items-center gap-2 rounded-md border-2 px-3 text-sm",
                    videoIndex === index ? "border-primary" : "border-border"
                  )}
                >
                  <PlayCircle className="h-4 w-4" />
                  Vidéo {index + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  )
}
