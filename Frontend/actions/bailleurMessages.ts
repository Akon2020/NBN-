import api from "@/lib/axios";
import { apiErrorMessage } from "@/lib/apiError";
import type { BailleurContactChannel, BailleurMessageHistory } from "@/lib/types";

// Échanges avec les bailleurs : bouton « Emails », traces des contacts
// lancés depuis « Contacts », et historique d'un bailleur.

export const sendBailleurEmails = async (payload: {
  idBailleurs: number[];
  subject: string;
  message: string;
}): Promise<{ sent: number; withoutEmail: string[] }> => {
  try {
    const res = await api.post<{ data: { sent: number; withoutEmail: string[] } }>(
      "/api/bailleur-messages/emails",
      payload
    );
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Les e-mails n'ont pas pu être envoyés"));
  }
};

// Non bloquant par nature : l'appel ou le WhatsApp est déjà parti du téléphone.
export const logBailleurContact = async (
  idBailleur: number,
  channel: BailleurContactChannel,
  body?: string
): Promise<void> => {
  try {
    await api.post("/api/bailleur-messages/contact-log", { idBailleur, channel, body });
  } catch {
    // Trace perdue : l'échange a eu lieu, on n'interrompt pas l'agent.
  }
};

export const getBailleurMessages = async (idBailleur: number): Promise<BailleurMessageHistory> => {
  try {
    const res = await api.get<{ data: BailleurMessageHistory }>(`/api/bailleur-messages/bailleur/${idBailleur}`);
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Erreur lors de la récupération des échanges"));
  }
};
