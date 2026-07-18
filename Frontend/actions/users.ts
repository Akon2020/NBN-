import api from "@/lib/axios";
import axios from "axios";
import { User } from "@/types/type";
import { UserSession } from "@/lib/types";

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const res = await api.get<{ nombre: number; usersInfo: User[] }>(
      "/api/users"
    );
    return res.data.usersInfo;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message ||
          "Erreur lors de la récupération des utilisateurs"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export interface UserInput {
  fullName: string;
  email: string;
  role: string;
}

export const createUser = async (input: UserInput): Promise<User> => {
  try {
    const res = await api.post<{ message: string; data: User }>(
      "/api/users/add",
      input
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la création de l'utilisateur"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const updateUser = async (
  id: number,
  input: Partial<UserInput & { status: "ACTIVE" | "INACTIVE" }>
): Promise<User> => {
  try {
    const res = await api.patch<{ message: string; data: User }>(
      `/api/users/update/${id}`,
      input
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la mise à jour de l'utilisateur"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const deleteUser = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/users/delete/${id}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la suppression de l'utilisateur"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

// GOAL 16 — changement en libre-service, réservé au propriétaire du compte
// côté Backend (403 sinon) — révoque toutes ses sessions actives.
export const changeOwnPassword = async (
  id: number,
  oldPassword: string,
  newPassword: string,
  confirmNewPassword: string
): Promise<void> => {
  try {
    await api.patch(`/api/users/update/${id}/password`, {
      oldPassword,
      newPassword,
      confirmNewPassword,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors du changement de mot de passe"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

// GOAL 16 — réinitialisation par un administrateur (users:manage), sans
// connaître l'ancien mot de passe — révoque toutes les sessions de la cible.
export const resetUserPassword = async (
  id: number,
  newPassword: string
): Promise<void> => {
  try {
    await api.patch(`/api/users/update/${id}/reset-password`, { newPassword });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la réinitialisation du mot de passe"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const getUserSessions = async (id: number): Promise<UserSession[]> => {
  try {
    const res = await api.get<{ nombre: number; data: UserSession[] }>(
      `/api/users/${id}/sessions`
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la récupération des sessions"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const revokeUserSessions = async (id: number): Promise<void> => {
  try {
    await api.patch(`/api/users/${id}/sessions/revoke-all`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la révocation des sessions"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export interface UserDirectoryEntry {
  idUser: number;
  fullName: string;
  role: string;
}

// GOAL 11 — annuaire minimal ouvert à tout utilisateur authentifié
// (contrairement à `getAllUsers`, réservé à `users:read`), pour les
// sélecteurs d'assignation (participants de calendrier, etc.).
export const getUsersDirectory = async (): Promise<UserDirectoryEntry[]> => {
  try {
    const res = await api.get<{ nombre: number; data: UserDirectoryEntry[] }>(
      "/api/users/directory"
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message ||
          "Erreur lors de la récupération de l'annuaire"
      );
    }
    throw new Error("Erreur inconnue");
  }
};
