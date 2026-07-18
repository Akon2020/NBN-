import api from "@/lib/axios";
import axios from "axios";
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

export const createCommissionnaire = async (
  payload: CommissionnaireCreatePayload
): Promise<Commissionnaire> => {
  try {
    const res = await api.post<{ message: string; data: Commissionnaire }>(
      "/api/commissionnaires",
      payload
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la création du commissionnaire"
      );
    }
    throw new Error("Erreur inconnue");
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

// GOAL 4 — clients apportés par ce commissionnaire (Client.sourceCommissionnaireCode).
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
