"use client";

import type React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // ADMIN-G01 : le cookie httpOnly n'étant pas lisible en JS, on ne peut
    // plus présumer d'une session active à partir d'un cookie côté client —
    // on interroge directement le backend, qui tranche.
    const checkIfAlreadyLoggedIn = async () => {
      try {
        const response = await api.get("/api/auth/profile/");

        if (response.status === 200 && response.data.authenticated) {
          const user = response.data.user;

          if (user.role === "admin") {
            router.push("/dashboard");
          } else if (user.role === "agent") {
            router.push("/dashboard/search");
          }
        }
      } catch (error) {
        // Non authentifié : on reste sur la page d'auth.
      }
    };

    checkIfAlreadyLoggedIn();
  }, [router]);

  return <>{children}</>;
}
