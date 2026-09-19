import api from "@/lib/axios";
import { apiErrorMessage } from "@/lib/apiError";
import { RentalRequest, RentalRequestPayload } from "@/lib/types";

const handleError = (error: unknown, fallback: string): never => {
  throw new Error(apiErrorMessage(error, fallback));
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

// Ouvre la fiche PDF dans un nouvel onglet. L'onglet est créé AVANT l'appel
// réseau : Safari iOS bloque un window.open déclenché après un `await`.
export const openRentalRequestPdf = async (id: number): Promise<void> => {
  const tab = window.open("", "_blank");
  try {
    const res = await api.get<Blob>(`/api/rental-requests/${id}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    if (tab) tab.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    return handleError(error, "Impossible d'ouvrir la fiche PDF");
  }
};

// Suppression logique : le commentaire est obligatoire et reste dans le
// rapport des demandes.
export const deleteRentalRequest = async (id: number, reason: string): Promise<void> => {
  try {
    await api.delete(`/api/rental-requests/${id}`, { data: { reason } });
  } catch (error) {
    return handleError(error, "La suppression de la fiche a échoué");
  }
};

export interface AssignRentalRequestPayload {
  assigneeUserIds: number[];
  idCommissionnaires: number[];
  extraEmails: string[];
  dateEcheance?: string;
  note?: string;
}

export const assignRentalRequest = async (
  id: number,
  payload: AssignRentalRequestPayload
): Promise<{ idTask: number; emailsQueued: number; withoutEmail: string[] }> => {
  try {
    const res = await api.post<{
      data: { idTask: number; emailsQueued: number; withoutEmail: string[] };
    }>(`/api/rental-requests/${id}/assign`, payload);
    return res.data.data;
  } catch (error) {
    return handleError(error, "L'assignation de la tâche a échoué");
  }
};
