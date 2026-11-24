"use client";

import type React from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import api from "@/lib/axios";

// Pages où une session déjà ouverte ne doit pas rediriger : on peut vouloir
// définir un mot de passe pour un autre compte ou activer une clé reçue.
const NO_REDIRECT = ["/auth/reset-password", "/auth/activer"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (NO_REDIRECT.some((path) => pathname?.startsWith(path))) return;
    // Le cookie httpOnly n'est pas lisible en JS : seul le Backend sait si
    // une session est ouverte.
    let cancelled = false;
    api
      .get("/api/auth/profile/")
      .then((response) => {
        if (!cancelled && response.status === 200 && response.data.authenticated) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        // Pas de session : on reste sur la page.
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return <>{children}</>;
}
