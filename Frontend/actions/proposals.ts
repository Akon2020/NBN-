import api from "@/lib/axios";
import { apiErrorMessage } from "@/lib/apiError";
import type { ProposalChannel, SentProposal } from "@/lib/types";

// Propositions de biens envoyées à un client (panier → WhatsApp/e-mail).

export const sendProposals = async (payload: {
  idClient: number;
  idProperties: number[];
  channel: ProposalChannel;
  message?: string;
}): Promise<{ created: number; total: number; pipelineAdvanced: boolean }> => {
  try {
    const res = await api.post<{ data: { created: number; total: number; pipelineAdvanced: boolean } }>(
      "/api/proposals/batch",
      payload
    );
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Les propositions n'ont pas pu être enregistrées"));
  }
};

export const getClientProposals = async (idClient: number): Promise<SentProposal[]> => {
  try {
    const res = await api.get<{ data: SentProposal[] }>(`/api/proposals/client/${idClient}`);
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Erreur lors de la récupération des propositions"));
  }
};
