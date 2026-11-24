"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Info, KeyRound, Loader2, LogIn } from "lucide-react";
import { login, PasswordChangeRequiredError } from "@/actions/auth";
import { AuthShell, authButtonClass, authInputClass } from "@/components/auth/auth-shell";

// Destination après connexion : uniquement une page interne du dashboard
// (jamais une URL externe passée dans le lien).
const safeNext = (value: string | null) =>
  value && value.startsWith("/dashboard") && !value.startsWith("//") ? value : "/dashboard";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [next, setNext] = useState("/dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(safeNext(params.get("next")));
    if (params.get("expired")) setNotice("Votre session a expiré. Reconnectez-vous pour continuer.");
    if (params.get("reset")) setNotice("Mot de passe modifié. Connectez-vous avec votre nouveau mot de passe.");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
      // Le Backend reste seul juge des permissions (CLAUDE.md §2) : tout
      // utilisateur authentifié entre, l'affichage suit ses droits.
      router.replace(next);
    } catch (err) {
      if (err instanceof PasswordChangeRequiredError) {
        router.push(`/auth/reset-password?token=${encodeURIComponent(err.setupToken)}`);
        return;
      }
      setError(err instanceof Error ? err.message : "Erreur lors de la connexion");
      setIsLoading(false);
    }
  };

  return (
    <AuthShell title="Bon retour" description="Connectez-vous à votre espace Nyumbani Express.">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
        {notice && !error && (
          <p role="status" className="flex gap-2 rounded-xl border border-primary-900/15 bg-primary-900/5 p-3 text-sm dark:border-white/15 dark:bg-white/5">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {notice}
          </p>
        )}
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
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="prenom.nom@nbnexpress.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className={authInputClass}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </label>
            <Link href="/auth/forgot-password" className="text-sm font-medium text-accent-600 hover:underline dark:text-accent-500">
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              // En mode « afficher », le champ devient un texte : sans ces
              // attributs, iOS y met une majuscule et le corrige à la volée.
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className={`${authInputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>

        <button type="submit" className={authButtonClass} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Connexion en cours...
            </>
          ) : (
            <>
              <LogIn className="h-5 w-5" aria-hidden />
              Se connecter
            </>
          )}
        </button>

        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <KeyRound className="h-4 w-4" aria-hidden />
            Vous avez reçu une clé d&apos;accès ?
          </p>
          <p className="mt-1">
            Commissionnaires : activez votre espace avec la clé envoyée par l&apos;agence.{" "}
            <Link href="/auth/activer" className="font-semibold text-accent-600 hover:underline dark:text-accent-500">
              Activer mon espace
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
