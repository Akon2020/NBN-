import api from "@/lib/axios";
import axios from "axios";
import { Alert, AlertSeverite, AlertStatut } from "@/lib/types";

const handleError = (error: unknown, fallback: string): never => {
  if (axios.isAxiosError(error)) {
    throw new Error(error.response?.data?.message || fallback);
  }
  throw new Error("Erreur inconnue");
};

export const getAllAlerts = async (): Promise<Alert[]> => {
  try {
    const res = await api.get<{ nombre: number; data: Alert[] }>("/api/alerts");
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération des alertes");
  }
};

export interface AlertInput {
  type: string;
  title: string;
  description?: string;
  severite?: AlertSeverite;
  assignedTo?: number;
}

// GOAL 20 — POST /api/alerts (alerts:manage) existait déjà côté Backend
// sans jamais être appelé par le Frontend — permet la création manuelle
// d'une alerte, en plus des alertes générées automatiquement par le système.
export const createAlert = async (input: AlertInput): Promise<Alert> => {
  try {
    const res = await api.post<{ message: string; data: Alert }>("/api/alerts", input);
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la création de l'alerte");
  }
};

export const getSingleAlert = async (id: number): Promise<Alert> => {
  try {
    const res = await api.get<{ data: Alert }>(`/api/alerts/${id}`);
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération de l'alerte");
  }
};

export const transitionAlertStatus = async (id: number, statut: AlertStatut): Promise<Alert> => {
  try {
    const res = await api.patch<{ data: Alert }>(`/api/alerts/${id}/statut`, { statut });
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors du changement de statut de l'alerte");
  }
};

export const assignAlert = async (id: number, assignedTo: number): Promise<Alert> => {
  try {
    const res = await api.patch<{ data: Alert }>(`/api/alerts/${id}/assigner`, { assignedTo });
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de l'assignation de l'alerte");
  }
};
