// Ouverture d'un nouveau message Gmail prérempli (P0.5). L'expéditeur réel
// dépend du compte connecté dans Gmail : `authuser` sélectionne celui de
// l'agence s'il est ouvert dans le navigateur. Sur téléphone, l'application
// Gmail n'accepte pas ces paramètres : on y préfère le lien `mailto:`, qui
// ouvre l'application de messagerie par défaut.

export const AGENCY_GMAIL_ACCOUNT = process.env.NEXT_PUBLIC_GMAIL_ACCOUNT || "contact@nbnexpress.org"

type Compose = {
  to?: string | string[] | null
  bcc?: string | string[] | null
  subject?: string
  body?: string
  account?: string
}

const list = (value?: string | string[] | null) =>
  (Array.isArray(value) ? value : value ? [value] : []).map((v) => v.trim()).filter(Boolean)

export const gmailComposeLink = ({ to, bcc, subject = "", body = "", account = AGENCY_GMAIL_ACCOUNT }: Compose): string => {
  const params = [
    `authuser=${encodeURIComponent(account)}`,
    "view=cm",
    "fs=1",
    `to=${encodeURIComponent(list(to).join(","))}`,
  ]
  const hidden = list(bcc)
  if (hidden.length) params.push(`bcc=${encodeURIComponent(hidden.join(","))}`)
  params.push(`su=${encodeURIComponent(subject)}`, `body=${encodeURIComponent(body)}`)
  return `https://mail.google.com/mail/?${params.join("&")}`
}

export const mailtoComposeLink = ({ to, bcc, subject = "", body = "" }: Compose): string => {
  const params = [`subject=${encodeURIComponent(subject)}`, `body=${encodeURIComponent(body)}`]
  const hidden = list(bcc)
  if (hidden.length) params.unshift(`bcc=${encodeURIComponent(hidden.join(","))}`)
  return `mailto:${list(to).map(encodeURIComponent).join(",")}?${params.join("&")}`
}

// Écran tactile sans souris : téléphone ou tablette.
export const isTouchDevice = () =>
  typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true

/** Ouvre le message dans le geste de l'utilisateur (sinon bloqué comme pop-up sur iPhone). */
export const openCompose = (compose: Compose, prefer: "gmail" | "mailto" | "auto" = "auto") => {
  const useMailto = prefer === "mailto" || (prefer === "auto" && isTouchDevice())
  if (useMailto) {
    window.location.href = mailtoComposeLink(compose)
    return
  }
  const opened = window.open(gmailComposeLink(compose), "_blank", "noopener,noreferrer")
  if (!opened) window.location.href = mailtoComposeLink(compose)
}

export const replySubject = (subject?: string | null) => {
  const value = (subject ?? "").trim()
  return /^re\s*:/i.test(value) ? value : `Re: ${value}`.trim()
}
