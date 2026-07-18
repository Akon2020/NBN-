import api from "@/lib/axios";
import axios from "axios";
import { User } from "@/types/type";

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
