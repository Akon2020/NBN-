import api from "@/lib/axios";
import axios from "axios";
import { Commission, CommissionCreatePayload } from "@/lib/types";

const handleError = (error: unknown, fallback: string): never => {
  if (axios.isAxiosError(error)) {
    throw new Error(error.response?.data?.message || fallback);
  }
  throw new Error("Erreur inconnue");
};

export const getAllCommissions = async (): Promise<Commission[]> => {
  try {
    const res = await api.get<{ nombre: number; data: Commission[] }>("/api/commissions");
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération des commissions");
  }
};

export const createCommission = async (
  payload: CommissionCreatePayload
): Promise<Commission> => {
  try {
    const res = await api.post<{ data: Commission }>("/api/commissions", payload);
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors du calcul de la commission");
  }
};

export const markCommissionDue = async (id: number, idCaisse: number): Promise<Commission> => {
  try {
    const res = await api.patch<{ data: Commission }>(`/api/commissions/${id}/marquer-due`, {
      idCaisse,
    });
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors du passage en 'due' de la commission");
  }
};
