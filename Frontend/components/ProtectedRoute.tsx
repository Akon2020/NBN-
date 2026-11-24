"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import api, { SESSION_EXPIRED_EVENT } from "@/lib/axios";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

// Au-delà de ce délai passé en arrière-plan (téléphone verrouillé, onglet
// caché), la session est revérifiée au retour : une page restée ouverte
// depuis la veille ne doit jamais rester affichée après l'expiration.
const REVALIDATE_AFTER_MS = 5 * 60 * 1000;

export default function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = "/auth/login",
}: ProtectedRouteProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [expired, setExpired] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const hiddenSince = useRef<number | null>(null);
  const authStatusRef = useRef(authStatus);
  authStatusRef.current = authStatus;

  const verifyAuth = useCallback(async () => {
    try {
      const response = await api.get("/api/auth/profile/");
      const userData = response.data.user;

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userData.role)) {
        setAuthStatus("unauthenticated");
        return;
      }
      try {
        localStorage.setItem("user", JSON.stringify(userData));
      } catch {
        // Affichage seulement : sans effet sur l'accès.
      }
      setAuthStatus("authenticated");
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      // Sans réponse (réseau coupé), on ne déconnecte pas quelqu'un dont la
      // session est peut-être valide ; seule une réponse 401 l'établit.
      if (status === 401 || status === 403) {
        setExpired(true);
        setAuthStatus("unauthenticated");
      } else if (authStatusRef.current === "loading") {
        setAuthStatus("unauthenticated");
      }
    }
  }, [allowedRoles]);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  useEffect(() => {
    const onExpired = () => {
      setExpired(true);
      setAuthStatus("unauthenticated");
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenSince.current = Date.now();
        return;
      }
      if (hiddenSince.current && Date.now() - hiddenSince.current > REVALIDATE_AFTER_MS) {
        verifyAuth();
      }
      hiddenSince.current = null;
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    document.addEventListener("visibilitychange", onVisibility);
    // Safari iOS restaure parfois la page depuis son cache (bouton retour).
    const onPageShow = (event: PageTransitionEvent) => event.persisted && verifyAuth();
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [verifyAuth]);

  useEffect(() => {
    if (authStatus !== "unauthenticated") return;
    const params = new URLSearchParams();
    if (expired) params.set("expired", "1");
    if (pathname && pathname !== "/dashboard") params.set("next", pathname);
    const query = params.toString();
    router.replace(`${redirectTo}${query ? `?${query}` : ""}`);
  }, [authStatus, expired, pathname, redirectTo, router]);

  if (authStatus === "authenticated") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" aria-hidden />
        <p className="text-muted-foreground">
          {authStatus === "loading" ? "Vérification de la session..." : "Session terminée, redirection vers la connexion..."}
        </p>
      </div>
    </div>
  );
}
