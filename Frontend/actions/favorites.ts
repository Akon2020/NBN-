import api from "@/lib/axios";
import axios from "axios";
import { Favorite } from "@/lib/types";

export const getMyFavorites = async (): Promise<Favorite[]> => {
  try {
    const res = await api.get<{ nombre: number; data: Favorite[] }>(
      "/api/favorites"
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message ||
          "Erreur lors de la récupération des favoris"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const addFavorite = async (idProperty: number): Promise<Favorite> => {
  try {
    const res = await api.post<{ message: string; data: Favorite }>(
      "/api/favorites",
      { idProperty }
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de l'ajout aux favoris"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const removeFavorite = async (idProperty: number): Promise<void> => {
  try {
    await api.delete(`/api/favorites/${idProperty}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors du retrait des favoris"
      );
    }
    throw new Error("Erreur inconnue");
  }
};
