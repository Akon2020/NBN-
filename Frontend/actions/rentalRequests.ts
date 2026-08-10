import api from "@/lib/axios";
import axios from "axios";
import { RentalRequest, RentalRequestPayload } from "@/lib/types";

const handleError = (error: unknown, fallback: string): never => {
  if (axios.isAxiosError(error)) {
    throw new Error(error.response?.data?.message || fallback);
  }
  throw new Error("Erreur inconnue");
};

// Route publique (aucune authentification) — appelée depuis la page
// `/demande-location`, accessible sans compte.
export const submitRentalRequest = async (
  payload: RentalRequestPayload
): Promise<{ idRentalRequest: number; dossierNumber: string | null }> => {
  try {
    const res = await api.post<{
      message: string;
      data: { idRentalRequest: number; dossierNumber: string | null };
    }>("/api/rental-requests", payload);
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de l'envoi de votre demande");
  }
};

export const getAllRentalRequests = async (q?: string): Promise<RentalRequest[]> => {
  try {
    const res = await api.get<{ nombre: number; data: RentalRequest[] }>("/api/rental-requests", {
      params: { q },
    });
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération des demandes");
  }
};

export const getSingleRentalRequest = async (id: number): Promise<RentalRequest> => {
  try {
    const res = await api.get<{ data: RentalRequest }>(`/api/rental-requests/${id}`);
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération de la demande");
  }
};
