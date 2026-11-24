"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react"
import { requestPasswordReset } from "@/actions/auth"
import { AuthShell, authButtonClass, authInputClass } from "@/components/auth/auth-shell"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sentMessage, setSentMessage] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      setSentMessage(await requestPasswordReset(email))
    } catch (err) {
      setError(err instanceof Error ? err.message : "La demande n'a pas pu être envoyée.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      description={
        sentMessage
          ? "Consultez votre boîte de réception."
          : "Indiquez l'adresse e-mail de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe."
      }
    >
      {sentMessage ? (
        <div className="space-y-6">
          <div role="status" className="flex gap-3 rounded-2xl border border-success-500/30 bg-success-500/10 p-4">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-success-500" aria-hidden />
            <div className="space-y-2 text-sm">
              <p className="font-medium">{sentMessage}</p>
              <p className="text-muted-foreground">
                Le lien ne sert qu&apos;une seule fois. Pensez à vérifier les courriers indésirables.
              </p>
            </div>
          </div>
          <Link href="/auth/login" className={authButtonClass}>
            <ArrowLeft className="h-5 w-5" aria-hidden />
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p role="alert" className="flex gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-500">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className={authInputClass}
            />
          </div>
          <button type="submit" className={authButtonClass} disabled={isLoading || !email.trim()}>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Mail className="h-5 w-5" aria-hidden />}
            {isLoading ? "Envoi en cours..." : "Recevoir le lien"}
          </button>
          <Link
            href="/auth/login"
            className="flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour à la connexion
          </Link>
        </form>
      )}
    </AuthShell>
  )
}
