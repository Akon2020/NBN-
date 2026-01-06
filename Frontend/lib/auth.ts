"use client";

import Cookies from "js-cookie";

export const getAuthHeaders = (): { Authorization: string } => {
  const token = Cookies.get("token");

  if (!token) {
    throw new Error("Access token manquant");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return Cookies.get("token") === "true";
}

export function logout() {
  Cookies.remove("token");
  window.location.href = "/auth/login";
}
