"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Check, Eye, EyeOff, Loader2, X } from "lucide-react"
import { confirmNewPassword } from "@/actions/auth"
import { authButtonClass, authInputClass } from "@/components/auth/auth-shell"

// Même règle que le Backend (auth.controller.js) : 8 caractères, une
// lettre, un chiffre, un symbole.
export const PASSWORD_RULES = [
  { label: "8 caractères minimum", test: (v: string) => v.length >= 8 },
  { label: "Une lettre", test: (v: string) => /[a-zA-Z]/.test(v) },
  { label: "Un chiffre", test: (v: string) => /[0-9]/.test(v) },
  { label: "Un symbole (@, #, !, ...)", test: (v: string) => /[^\w\s]/.test(v) },
]

export const isPasswordAcceptable = (value: string) => PASSWORD_RULES.every((rule) => rule.test(value))

type Props = { token: string; email: string }

export function SetPasswordForm({ token, email }: Props) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const mismatch = confirm.length > 0 && confirm !== password
  const canSubmit = isPasswordAcceptable(password) && password === confirm && !isLoading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setError("")
    setIsLoading(true)
    try {
      const result = await confirmNewPassword(token, password)
      router.replace(result.signedIn ? "/dashboard" : "/auth/login?reset=1")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le mot de passe n'a pas pu être enregistré.")
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Champ caché : permet au gestionnaire de mots de passe d'iOS
          d'associer le nouveau mot de passe au bon compte. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      {error && (
        <p role="alert" className="flex gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-500">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <div className="space-y-2">
        <label htmlFor="new-password" className="text-sm font-medium">
          Nouveau mot de passe
        </label>
        <div className="relative">
          <input
            id="new-password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            aria-describedby="password-rules"
            className={`${authInputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
            aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-pressed={show}
          >
            {show ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
          </button>
        </div>
        <ul id="password-rules" className="grid grid-cols-2 gap-1.5 pt-1 text-xs">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(password)
            return (
              <li key={rule.label} className={`flex items-center gap-1.5 ${ok ? "text-success-500" : "text-muted-foreground"}`}>
                {ok ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
                {rule.label}
                <span className="sr-only">{ok ? " : respecté" : " : manquant"}</span>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="space-y-2">
        <label htmlFor="confirm-password" className="text-sm font-medium">
          Confirmer le mot de passe
        </label>
        <input
          id="confirm-password"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          disabled={isLoading}
          aria-invalid={mismatch}
          className={authInputClass}
        />
        {mismatch && <p className="text-sm text-error-500">Les deux mots de passe ne sont pas identiques.</p>}
      </div>
      <button type="submit" className={authButtonClass} disabled={!canSubmit}>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
        {isLoading ? "Enregistrement..." : "Enregistrer le mot de passe"}
      </button>
    </form>
  )
}
