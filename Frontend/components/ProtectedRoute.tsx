"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export default function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = "/auth/login",
}: ProtectedRouteProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const response = await api.get("/api/auth/profile/");

        const userData = response.data.user;
        setUser(userData);

        // Vérification des rôles si nécessaire
        if (allowedRoles && allowedRoles.length > 0) {
          if (!allowedRoles.includes(userData.role)) {
            console.warn("Accès refusé : rôle non autorisé", userData.role);
            setAuthStatus("unauthenticated");
            return;
          }
        }

        setAuthStatus("authenticated");
      } catch (error) {
        console.error("Utilisateur non authentifié", error);
        setAuthStatus("unauthenticated");
      }
    };

    verifyAuth();
  }, [allowedRoles]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace(redirectTo);
    }
  }, [authStatus, redirectTo, router]);

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">
            Vérification de l'authentification...
          </p>
        </div>
      </div>
    );
  }

  if (authStatus === "authenticated") {
    return <>{children}</>;
  }

  return null;
}
