import api from "@/lib/axios";
import axios from "axios";
import { Requisition, RequisitionCreatePayload } from "@/lib/types";

const handleError = (error: unknown, fallback: string): never => {
  if (axios.isAxiosError(error)) {
    throw new Error(error.response?.data?.message || fallback);
  }
  throw new Error("Erreur inconnue");
};

export const getAllRequisitions = async (): Promise<Requisition[]> => {
  try {
    const res = await api.get<{ nombre: number; data: Requisition[] }>("/api/requisitions");
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération des réquisitions");
  }
};

export const getMyRequisitions = async (): Promise<Requisition[]> => {
  try {
    const res = await api.get<{ nombre: number; data: Requisition[] }>("/api/requisitions/mine");
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération de vos réquisitions");
  }
};

export const createRequisition = async (
  payload: RequisitionCreatePayload
): Promise<Requisition> => {
  try {
    const res = await api.post<{ data: Requisition }>("/api/requisitions", payload);
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la soumission de la réquisition");
  }
};

export const approveRequisition = async (id: number): Promise<Requisition> => {
  try {
    const res = await api.patch<{ data: Requisition }>(`/api/requisitions/${id}/approuver`);
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de l'approbation de la réquisition");
  }
};

export const rejectRequisition = async (
  id: number,
  motifDecision: string
): Promise<Requisition> => {
  try {
    const res = await api.patch<{ data: Requisition }>(`/api/requisitions/${id}/rejeter`, {
      motifDecision,
    });
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors du rejet de la réquisition");
  }
};

export const requestRequisitionComplement = async (
  id: number,
  motifDecision: string
): Promise<Requisition> => {
  try {
    const res = await api.patch<{ data: Requisition }>(
      `/api/requisitions/${id}/demander-complement`,
      { motifDecision }
    );
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la demande de complément");
  }
};

// Le token vit dans un cookie httpOnly (lib/axios.ts) — un lien direct
// vers l'API risquerait de ne pas envoyer le cookie selon la politique
// SameSite. On passe par axios (withCredentials) et on ouvre le blob reçu.
export const openRequisitionPdf = async (id: number): Promise<void> => {
  try {
    const res = await api.get(`/api/requisitions/${id}/pdf`, { responseType: "blob" });
    const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    window.open(blobUrl, "_blank");
  } catch (error) {
    return handleError(error, "Erreur lors de la génération du PDF");
  }
};
