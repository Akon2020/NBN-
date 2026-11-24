import Link from "next/link"
import { LogIn } from "lucide-react"
import { AuthShell, authButtonClass } from "@/components/auth/auth-shell"

// Outil interne : pas d'inscription libre. Les comptes sont créés par
// l'administrateur, les commissionnaires activent la clé reçue.
export default function RegisterPage() {
  return (
    <AuthShell
      title="Demander un accès"
      description="Les comptes de l'équipe sont créés par l'administrateur de l'agence. Les commissionnaires activent leur espace avec la clé d'accès reçue."
    >
      <div className="space-y-3">
        <Link href="/auth/login" className={authButtonClass}>
          <LogIn className="h-5 w-5" aria-hidden />
          Se connecter
        </Link>
        <Link
          href="/auth/activer"
          className="flex min-h-12 items-center justify-center rounded-xl border border-border font-semibold hover:bg-muted"
        >
          J&apos;ai une clé d&apos;accès
        </Link>
      </div>
    </AuthShell>
  )
}
