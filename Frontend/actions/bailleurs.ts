import api from "@/lib/axios";
import axios from "axios";
import { Bailleur, BailleurCreatePayload, BailleurUpdatePayload, Property } from "@/lib/types";
import { apiErrorMessage } from "@/lib/apiError";

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

// Création avec pièce d'identité : multipart `data` (JSON) + `pieceIdentite`.
export const createBailleur = async (
  payload: BailleurCreatePayload,
  pieceIdentite: File
): Promise<Bailleur> => {
  try {
    const formData = new FormData();
    formData.append("data", JSON.stringify(payload));
    formData.append("pieceIdentite", pieceIdentite);
    const res = await api.post<{ message: string; data: Bailleur }>("/api/bailleurs", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Erreur lors de la création du bailleur"));
  }
};

// « Joindre un bien existant » : seuls les biens sans bailleur sont acceptés.
export const linkBailleurProperties = async (id: number, idProperties: number[]): Promise<number> => {
  try {
    const res = await api.post<{ data: { linked: number } }>(`/api/bailleurs/${id}/properties`, { idProperties });
    return res.data.data.linked;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Les biens n'ont pas pu être rattachés"));
  }
};

export const uploadBailleurIdentityDocument = async (id: number, file: File): Promise<void> => {
  try {
    const formData = new FormData();
    formData.append("pieceIdentite", file);
    await api.post(`/api/bailleurs/${id}/piece-identite`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } catch (error) {
    throw new Error(apiErrorMessage(error, "La pièce d'identité n'a pas pu être envoyée"));
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

// « Aperçu » : les biens à l'actif du bailleur.
export const getBailleurProperties = async (id: number): Promise<Property[]> => {
  try {
    const res = await api.get<{ nombre: number; data: Property[] }>(`/api/bailleurs/${id}/properties`);
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Erreur lors de la récupération des biens du bailleur"));
  }
};

export const uploadBailleurPhoto = async (id: number, file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append("image", file);
    const res = await api.post<{ data: { photo: string } }>(`/api/bailleurs/${id}/photo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data.photo;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "La photo n'a pas pu être envoyée"));
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
