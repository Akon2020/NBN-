import api from "@/lib/axios";
import axios from "axios";
import { apiErrorMessage } from "@/lib/apiError";
import { Auth, AuthPayload, Data, User } from "@/types/type";

// Le jeton vit uniquement dans le cookie httpOnly posé par le backend
// (ADMIN-G01 : source unique, plus de copie côté client via js-cookie).
// localStorage.user ne sert qu'à l'affichage (nom/rôle dans la sidebar),
// jamais de décision d'authentification.
// Connexion refusée parce que le compte utilise encore le mot de passe par
// défaut : le Backend fournit un jeton court pour choisir le sien.
export class PasswordChangeRequiredError extends Error {
  constructor(message: string, public setupToken: string) {
    super(message);
  }
}

export const login = async (data: AuthPayload): Promise<Auth> => {
  try {
    const res = await api.post<Auth>("/api/auth/login/", data, {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    });
    localStorage.setItem("user", JSON.stringify(res.data.data.userInfo));
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.requiresPasswordChange && error.response.data.setupToken) {
      throw new PasswordChangeRequiredError(error.response.data.message, error.response.data.setupToken);
    }
    // Identifiants refusés, compte désactivé, quota dépassé ou serveur
    // injoignable : chaque cas a son propre message (voir lib/apiError).
    throw new Error(apiErrorMessage(error, "Erreur lors de la connexion"));
  }
};

export const logout = async (): Promise<{ message: string }> => {
  try {
    localStorage.removeItem("user");

    const res = await api.post<{ message: string }>(
      "/api/auth/logout/",
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );

    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la déconnexion"
      );
    }
    throw new Error("Erreur inconnue lors de la déconnexion");
  }
};

export const requestPasswordReset = async (email: string): Promise<string> => {
  try {
    const res = await api.post<{ message: string }>("/api/auth/forgot-password", { email: email.trim().toLowerCase() });
    return res.data.message;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "La demande n'a pas pu être envoyée."));
  }
};

export type TokenInfo = {
  valid: true;
  purpose: "PASSWORD_RESET" | "PASSWORD_SETUP" | "ACCESS_KEY";
  email: string;
  fullName: string;
  expiresAt: string;
};

export const checkAuthToken = async (token: string): Promise<TokenInfo> => {
  try {
    const res = await api.post<TokenInfo>("/api/auth/token/check", { token });
    return res.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Ce lien ou cette clé n'est pas valide."));
  }
};

export const confirmNewPassword = async (
  token: string,
  newPassword: string
): Promise<{ message: string; signedIn: boolean; user?: User }> => {
  try {
    const res = await api.post("/api/auth/reset-password/confirm", { token, newPassword });
    if (res.data.signedIn && res.data.data?.userInfo) {
      localStorage.setItem("user", JSON.stringify(res.data.data.userInfo));
    }
    return { message: res.data.message, signedIn: !!res.data.signedIn, user: res.data.data?.userInfo };
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Le mot de passe n'a pas pu être enregistré."));
  }
};
