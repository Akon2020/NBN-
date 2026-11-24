import api from "@/lib/axios";
import axios from "axios";
import { apiErrorMessage } from "@/lib/apiError";
import type { CommissionnaireStats, FieldAgentProfil, IdDocumentType } from "@/lib/types";
import {
  Client,
  Commissionnaire,
  CommissionnaireCreatePayload,
  CommissionnaireIncident,
  CommissionnaireScorePayload,
  CommissionnaireUpdatePayload,
  IncidentCreatePayload,
} from "@/lib/types";

export const getAllCommissionnaires = async (): Promise<Commissionnaire[]> => {
  try {
    const res = await api.get<{ nombre: number; data: Commissionnaire[] }>(
      "/api/commissionnaires"
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message ||
          "Erreur lors de la récupération des commissionnaires"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const getSingleCommissionnaire = async (id: number): Promise<Commissionnaire> => {
  try {
    const res = await api.get<Commissionnaire>(`/api/commissionnaires/${id}`);
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la récupération du commissionnaire"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

// Multipart : `data` (JSON) + recto obligatoire et verso facultatif de la
// pièce d'identité. Le code CMR / CTR est attribué par le serveur.
export const createCommissionnaire = async (
  payload: CommissionnaireCreatePayload,
  files: { recto: File | null; verso?: File | null }
): Promise<{ message: string; data: Commissionnaire }> => {
  try {
    const form = new FormData();
    form.append("data", JSON.stringify(payload));
    if (files.recto) form.append("pieceRecto", files.recto);
    if (files.verso) form.append("pieceVerso", files.verso);
    const res = await api.post<{ message: string; data: Commissionnaire }>("/api/commissionnaires", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Erreur lors de la création de la fiche"));
  }
};

export const previewNextCommissionnaireCode = async (profil: FieldAgentProfil): Promise<string | null> => {
  try {
    const res = await api.get<{ data: { code: string } }>("/api/commissionnaires/next-code", { params: { profil } });
    return res.data.data.code;
  } catch {
    return null;
  }
};

export const getCommissionnaireStats = async (): Promise<CommissionnaireStats> => {
  try {
    const res = await api.get<{ data: CommissionnaireStats }>("/api/commissionnaires/stats");
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Erreur lors du calcul des statistiques"));
  }
};

export const replaceCommissionnaireIdentityDocument = async (
  id: number,
  payload: { idDocumentType?: IdDocumentType; idNumber?: string },
  files: { recto?: File | null; verso?: File | null }
): Promise<Commissionnaire> => {
  try {
    const form = new FormData();
    form.append("data", JSON.stringify(payload));
    if (files.recto) form.append("pieceRecto", files.recto);
    if (files.verso) form.append("pieceVerso", files.verso);
    const res = await api.post<{ data: Commissionnaire }>(`/api/commissionnaires/${id}/piece-identite`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "La pièce d'identité n'a pas pu être enregistrée"));
  }
};

// Le fichier se télécharge par l'API (cookie de session) puis s'affiche
// dans un onglet ouvert d'avance (sinon bloqué comme pop-up sur iPhone).
export const openCommissionnaireIdentityDocument = async (id: number, face: "recto" | "verso" = "recto") => {
  const tab = window.open("", "_blank");
  try {
    const res = await api.get(`/api/commissionnaires/${id}/piece-identite`, {
      params: { face },
      responseType: "blob",
    });
    const url = URL.createObjectURL(res.data as Blob);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (error) {
    tab?.close();
    throw new Error(apiErrorMessage(error, "Pièce d'identité indisponible"));
  }
};

export const updateCommissionnaire = async (
  id: number,
  payload: CommissionnaireUpdatePayload
): Promise<Commissionnaire> => {
  try {
    const res = await api.patch<{ message: string; data: Commissionnaire }>(
      `/api/commissionnaires/${id}`,
      payload
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la mise à jour du commissionnaire"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const updateCommissionnaireScore = async (
  id: number,
  payload: CommissionnaireScorePayload
): Promise<Commissionnaire> => {
  try {
    const res = await api.patch<{ message: string; data: Commissionnaire }>(
      `/api/commissionnaires/${id}/score`,
      payload
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de l'évaluation du score"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const createIncident = async (
  id: number,
  payload: IncidentCreatePayload
): Promise<{ incident: CommissionnaireIncident; commissionnaire: Commissionnaire }> => {
  try {
    const res = await api.post<{
      message: string;
      data: CommissionnaireIncident;
      commissionnaire: Commissionnaire;
    }>(`/api/commissionnaires/${id}/incidents`, payload);
    return { incident: res.data.data, commissionnaire: res.data.commissionnaire };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de l'enregistrement de l'incident"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const deleteCommissionnaire = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/commissionnaires/${id}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la suppression du commissionnaire"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

// GOAL 4 - clients apportés par ce commissionnaire (Client.sourceCommissionnaireCode).
export const getCommissionnaireClients = async (id: number): Promise<Client[]> => {
  try {
    const res = await api.get<{ nombre: number; data: Client[] }>(
      `/api/commissionnaires/${id}/clients`
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la récupération des clients apportés"
      );
    }
    throw new Error("Erreur inconnue");
  }
};
