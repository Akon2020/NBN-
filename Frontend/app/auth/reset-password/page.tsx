"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, Loader2 } from "lucide-react"
import { checkAuthToken, type TokenInfo } from "@/actions/auth"
import { AuthShell, authButtonClass } from "@/components/auth/auth-shell"
import { SetPasswordForm } from "@/components/auth/set-password-form"

const TITLES: Record<TokenInfo["purpose"], string> = {
  PASSWORD_RESET: "Nouveau mot de passe",
  PASSWORD_SETUP: "Choisissez votre mot de passe",
  ACCESS_KEY: "Activez votre espace",
}

// Page ouverte depuis le lien reçu par e-mail (réinitialisation) ou après
// une connexion avec le mot de passe par défaut. Le lien n'ouvre jamais de
// session à lui seul : il faut choisir un mot de passe.
export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null)
  const [info, setInfo] = useState<TokenInfo | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token") ?? ""
    setToken(value)
    if (!value) {
      setError("Ce lien est incomplet. Ouvrez-le directement depuis l'e-mail reçu.")
      return
    }
    checkAuthToken(value)
      .then(setInfo)
      .catch((err) => setError(err instanceof Error ? err.message : "Ce lien n'est pas valide."))
  }, [])

  return (
    <AuthShell
      title={info ? TITLES[info.purpose] : "Nouveau mot de passe"}
      description={
        info ? (
          <>
            {info.purpose === "PASSWORD_SETUP" && (
              <span className="mb-1 block">
                Première connexion : remplacez le mot de passe reçu par un mot de passe que vous seul connaissez.
              </span>
            )}
            Compte : <strong className="text-foreground">{info.email}</strong>
          </>
        ) : undefined
      }
    >
      {error ? (
        <div className="space-y-5">
          <p role="alert" className="flex gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-500">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
          <Link href="/auth/forgot-password" className={authButtonClass}>
            Demander un nouveau lien
          </Link>
        </div>
      ) : info && token ? (
        <SetPasswordForm token={token} email={info.email} />
      ) : (
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Vérification du lien...
        </p>
      )}
    </AuthShell>
  )
}
