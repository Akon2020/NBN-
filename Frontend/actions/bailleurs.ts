import api from "@/lib/axios";
import axios from "axios";
import { Bailleur, BailleurCreatePayload, BailleurUpdatePayload } from "@/lib/types";

export const getAllBailleurs = async (): Promise<Bailleur[]> => {
  try {
    const res = await api.get<{ nombre: number; data: Bailleur[] }>("/api/bailleurs");
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message ||
          "Erreur lors de la récupération des bailleurs"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

// Pièce d'identité annexée (image ou PDF). Récupérée en Blob via l'API
// authentifiée : le fichier n'a aucune URL publique à ouvrir directement.
export const getBailleurIdentityDocument = async (id: number): Promise<Blob> => {
  try {
    const res = await api.get<Blob>(`/api/bailleurs/${id}/piece-identite`, {
      responseType: "blob",
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      throw new Error("Vous n'avez pas la permission de consulter cette pièce d'identité.");
    }
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error("Aucune pièce d'identité pour ce bailleur.");
    }
    throw new Error("Impossible d'ouvrir la pièce d'identité.");
  }
};

export const getSingleBailleur = async (id: number): Promise<Bailleur> => {
  try {
    const res = await api.get<Bailleur>(`/api/bailleurs/${id}`);
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la récupération du bailleur"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const createBailleur = async (
  payload: BailleurCreatePayload
): Promise<Bailleur> => {
  try {
    const res = await api.post<{ message: string; data: Bailleur }>(
      "/api/bailleurs",
      payload
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la création du bailleur"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const updateBailleur = async (
  id: number,
  payload: BailleurUpdatePayload
): Promise<Bailleur> => {
  try {
    const res = await api.patch<{ message: string; data: Bailleur }>(
      `/api/bailleurs/${id}`,
      payload
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la mise à jour du bailleur"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const deleteBailleur = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/bailleurs/${id}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la suppression du bailleur"
      );
    }
    throw new Error("Erreur inconnue");
  }
};
