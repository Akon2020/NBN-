// SEC-G06 (complément) — le Backend stocke le chemin relatif renvoyé par
// multer ("uploads/images/xxx.jpg", sans slash initial, cf.
// upload.middleware.js) et le sert désormais statiquement (app.js).
// `next/image` refuse un `src` relatif qui ne commence pas par "/" et une
// URL absolue http(s) — cette fonction est le seul endroit qui doit
// connaître ce détail de stockage, jamais reconstruit à la main dans
// chaque page.
export const getImageUrl = (path?: string | null): string => {
  if (!path) return "/placeholder.svg"
  if (/^https?:\/\//.test(path)) return path

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || ""
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}
