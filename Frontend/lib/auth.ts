"use client";

import { User } from "@/types/type";

// ADMIN-G01 : le jeton vit dans un cookie httpOnly, illisible en JS par
// conception. L'état d'authentification se vérifie uniquement via un appel
// réseau à /api/auth/profile (voir ProtectedRoute, useAuth), jamais par
// lecture directe d'un cookie côté client.

export function getAuthUser(): User | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem("user");
  return data ? JSON.parse(data) : null;
}
