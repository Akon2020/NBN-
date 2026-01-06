"use client";

import { User } from "@/types/type";
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

export function getAuthUser(): User | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem("user");
  return data ? JSON.parse(data) : null;
}

export function logout() {
  Cookies.remove("token");
  localStorage.removeItem("user");
  window.location.href = "/auth/login";
}
