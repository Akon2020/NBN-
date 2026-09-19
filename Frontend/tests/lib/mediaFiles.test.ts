import { describe, it, expect } from "vitest"
import { chunk, isAcceptedMedia, VIDEO_EXTENSIONS, VIDEO_TYPES } from "@/lib/mediaFiles"

describe("Médias d'un bien", () => {
  it("accepte les vidéos de téléphone, même sans type annoncé", () => {
    expect(isAcceptedMedia({ name: "visite.mov", type: "video/quicktime" }, VIDEO_TYPES, VIDEO_EXTENSIONS)).toBe(true)
    expect(isAcceptedMedia({ name: "VID_2026.3gp", type: "video/3gpp" }, VIDEO_TYPES, VIDEO_EXTENSIONS)).toBe(true)
    expect(isAcceptedMedia({ name: "visite.MOV", type: "" }, VIDEO_TYPES, VIDEO_EXTENSIONS)).toBe(true)
  })

  it("refuse un autre format", () => {
    expect(isAcceptedMedia({ name: "film.avi", type: "video/x-msvideo" }, VIDEO_TYPES, VIDEO_EXTENSIONS)).toBe(false)
    expect(isAcceptedMedia({ name: "photo.jpg", type: "" }, VIDEO_TYPES, VIDEO_EXTENSIONS)).toBe(false)
  })

  it("découpe un envoi en lots", () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7], 5)).toEqual([[1, 2, 3, 4, 5], [6, 7]])
  })
})
