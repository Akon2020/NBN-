"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  // Page ouverte quand il n'y a pas de page précédente sur le site (lien
  // reçu par WhatsApp, onglet neuf).
  fallback?: string
  label?: string
}

export function BackButton({ fallback = "/", label = "Retour" }: Props) {
  const router = useRouter()

  const goBack = () => {
    let sameSite = false
    try {
      sameSite = Boolean(document.referrer) && new URL(document.referrer).origin === window.location.origin
    } catch {
      sameSite = false
    }
    if (sameSite && window.history.length > 1) router.back()
    else router.push(fallback)
  }

  return (
    <Button type="button" variant="ghost" onClick={goBack} className="h-10 gap-2 px-3">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {label}
    </Button>
  )
}
