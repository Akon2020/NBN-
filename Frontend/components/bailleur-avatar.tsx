"use client"

import Image from "next/image"
import { getImageUrl } from "@/lib/imageUrl"
import { initialsOf } from "@/lib/bailleurs"
import { cn } from "@/lib/utils"

// Photo du bailleur, ou ses initiales sur fond navy tant qu'aucune photo n'a
// été ajoutée.
export function BailleurAvatar({
  photo,
  fullName,
  className,
}: {
  photo?: string | null
  fullName?: string | null
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-900 text-white",
        className
      )}
    >
      {photo ? (
        <Image src={getImageUrl(photo)} alt={fullName || "Bailleur"} fill sizes="96px" className="object-cover" />
      ) : (
        <span className="text-sm font-semibold">{initialsOf(fullName)}</span>
      )}
    </div>
  )
}
