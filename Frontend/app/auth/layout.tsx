"use client";

import type React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import Cookies from "js-cookie";
import { getAuthHeaders } from "@/lib/auth";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const checkIfAlreadyLoggedIn = async () => {
      try {
        const token = Cookies.get("token");

        if (token) {
          // Vérifier si le token est valide
          const response = await api.get("/api/auth/profile/", {
            headers: getAuthHeaders(),
          });

          if (response.status === 200) {
            const user = response.data;

            // Rediriger vers le dashboard approprié
            if (user.role === "admin") {
              router.push("/dashboard");
            } else if (user.role === "agent") {
              router.push("/dashboard/search");
            }
          }
        }
      } catch (error) {
        // Si le token est invalide, on reste sur la page d'auth
        console.log("Utilisateur non authentifié ou token expiré: ", error);
      }
    };

    checkIfAlreadyLoggedIn();
  }, [router]);

  return <>{children}</>;
}
