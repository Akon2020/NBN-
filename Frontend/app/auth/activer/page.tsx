"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { AlertCircle, KeyRound, Loader2 } from "lucide-react"
import { checkAuthToken, type TokenInfo } from "@/actions/auth"
import { AuthShell, authButtonClass, authInputClass } from "@/components/auth/auth-shell"
import { SetPasswordForm } from "@/components/auth/set-password-form"

// Première connexion d'un commissionnaire : la clé d'accès envoyée par
// l'agence (e-mail ou WhatsApp), puis le choix du mot de passe. La clé
// peut arriver dans le lien (?cle=) ou être saisie à la main.
export default function ActivatePage() {
  const [key, setKey] = useState("")
  const [info, setInfo] = useState<TokenInfo | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState("")

  const verify = async (value: string) => {
    setError("")
    setIsChecking(true)
    try {
      const result = await checkAuthToken(value)
      if (result.purpose !== "ACCESS_KEY") throw new Error("Cette clé n'est pas une clé d'accès.")
      setInfo(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cette clé n'est pas valide.")
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("cle")
    if (fromLink) {
      setKey(fromLink)
      verify(fromLink)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (key.trim()) verify(key)
  }

  return (
    <AuthShell
      title="Activez votre espace"
      description={
        info ? (
          <>
            Bonjour {info.fullName}. Choisissez le mot de passe de votre compte{" "}
            <strong className="text-foreground">{info.email}</strong>.
          </>
        ) : (
          "Saisissez la clé d'accès reçue de l'agence par e-mail ou WhatsApp."
        )
      }
    >
      {info ? (
        <SetPasswordForm token={key} email={info.email} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p role="alert" className="flex gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-500">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
          <div className="space-y-2">
            <label htmlFor="access-key" className="text-sm font-medium">
              Clé d&apos;accès
            </label>
            <input
              id="access-key"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="ABCDE-12345"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              required
              disabled={isChecking}
              className={`${authInputClass} text-center font-mono text-lg tracking-[0.2em]`}
            />
          </div>
          <button type="submit" className={authButtonClass} disabled={isChecking || !key.trim()}>
            {isChecking ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <KeyRound className="h-5 w-5" aria-hidden />}
            {isChecking ? "Vérification..." : "Continuer"}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
