import api from "@/lib/axios";
import { apiErrorMessage } from "@/lib/apiError";
import type { BailleurRelance, BailleurRelanceChannel, BailleurRelanceDetail } from "@/lib/types";

// Relances programmées auprès des bailleurs.

export const createBailleurRelance = async (payload: {
  channel: BailleurRelanceChannel;
  idBailleurs: number[];
  scheduledAt: string;
  subject?: string;
  message: string;
}): Promise<{ idRelance: number; statut: string; recipients: number; skipped: string[] }> => {
  try {
    const res = await api.post<{ data: { idRelance: number; statut: string; recipients: number; skipped: string[] } }>(
      "/api/bailleur-relances",
      payload
    );
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "La relance n'a pas pu être programmée"));
  }
};

export const getBailleurRelances = async (): Promise<BailleurRelance[]> => {
  try {
    const res = await api.get<{ data: BailleurRelance[] }>("/api/bailleur-relances");
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Erreur lors de la récupération des relances"));
  }
};

export const getBailleurRelance = async (id: number): Promise<BailleurRelanceDetail> => {
  try {
    const res = await api.get<{ data: BailleurRelanceDetail }>(`/api/bailleur-relances/${id}`);
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Erreur lors de la récupération de la relance"));
  }
};

export const cancelBailleurRelance = async (id: number): Promise<void> => {
  try {
    await api.post(`/api/bailleur-relances/${id}/cancel`);
  } catch (error) {
    throw new Error(apiErrorMessage(error, "La relance n'a pas pu être annulée"));
  }
};

export const markRelanceMessageSent = async (idMessage: number): Promise<number> => {
  try {
    const res = await api.post<{ data: { remaining: number } }>(`/api/bailleur-relances/messages/${idMessage}/sent`);
    return res.data.data.remaining;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Le message n'a pas pu être marqué envoyé"));
  }
};
