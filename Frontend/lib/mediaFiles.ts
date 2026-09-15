// Contrôle côté navigateur des médias d'un bien, aligné sur
// Backend/middlewares/upload.middleware.js (qui reste l'autorité).

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"]
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v", "video/3gpp", "video/3gpp2"]
export const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v", ".3gp"]

// Nombre de fichiers qu'une route accepte par envoi : au-delà, les fichiers
// partent en plusieurs lots successifs.
export const IMAGES_PER_UPLOAD = 10
export const VIDEOS_PER_UPLOAD = 5

const extensionOf = (name: string) => {
  const dot = name.lastIndexOf(".")
  return dot >= 0 ? name.slice(dot).toLowerCase() : ""
}

// Un navigateur peut ne pas connaître le type d'une vidéo .mov : l'extension
// fait alors foi, comme côté serveur.
export const isAcceptedMedia = (file: Pick<File, "name" | "type">, types: string[], extensions: string[]) =>
  types.includes(file.type) || (!file.type || file.type === "application/octet-stream"
    ? extensions.includes(extensionOf(file.name))
    : false)

export const chunk = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}
