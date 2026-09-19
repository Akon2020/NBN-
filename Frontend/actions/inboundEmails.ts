import api from "@/lib/axios";
import { apiErrorMessage } from "@/lib/apiError";
import type { InboundEmail, InboundEmailDetail, Mailbox, MailboxAudience } from "@/lib/types";

// Messages reçus sur les boîtes professionnelles (contact@, direction@…).
// Le Backend ne renvoie que les boîtes dont l'utilisateur fait partie de
// l'audience : aucun filtrage d'accès n'est fait ici.

export const getMyMailboxes = async (): Promise<Mailbox[]> => {
  try {
    const res = await api.get<{ data: Mailbox[] }>("/api/inbound-emails/mailboxes");
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Erreur lors de la récupération des boîtes"));
  }
};

export const getInboundEmails = async (params?: { mailbox?: string; q?: string }): Promise<InboundEmail[]> => {
  try {
    const res = await api.get<{ data: InboundEmail[] }>("/api/inbound-emails", { params });
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Erreur lors de la récupération des messages"));
  }
};

export const getInboundEmail = async (id: number): Promise<InboundEmailDetail> => {
  try {
    const res = await api.get<{ data: InboundEmailDetail }>(`/api/inbound-emails/${id}`);
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Erreur lors de la récupération du message"));
  }
};

// Audience des boîtes dont l'utilisateur est membre (seuls ses membres la règlent).
export const getMailboxAudiences = async (): Promise<MailboxAudience[]> => {
  try {
    const res = await api.get<{ data: MailboxAudience[] }>("/api/inbound-emails/mailboxes/audiences");
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Erreur lors de la récupération des boîtes"));
  }
};

export const updateMailboxAudience = async (
  key: string,
  audience: { roles: string[]; users: string[] }
): Promise<MailboxAudience> => {
  try {
    const res = await api.put<{ data: MailboxAudience }>(`/api/inbound-emails/mailboxes/${key}/audience`, audience);
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "L'audience n'a pas pu être enregistrée"));
  }
};

export const resetMailboxAudience = async (key: string): Promise<MailboxAudience> => {
  try {
    const res = await api.delete<{ data: MailboxAudience }>(`/api/inbound-emails/mailboxes/${key}/audience`);
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Le réglage du serveur n'a pas pu être rétabli"));
  }
};

export const replyToInboundEmail = async (id: number, message: string): Promise<void> => {
  try {
    await api.post(`/api/inbound-emails/${id}/reply`, { message });
  } catch (error) {
    throw new Error(apiErrorMessage(error, "La réponse n'a pas pu être envoyée"));
  }
};
