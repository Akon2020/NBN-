import api from "@/lib/axios";
import { apiErrorMessage } from "@/lib/apiError";

// Espace commissionnaire / collecteur (P1.2). Le Backend ne renvoie que ce
// qui concerne la fiche liée au compte connecté.

export type AmountsByCurrency = Record<string, number>;

export interface FieldAgentOverview {
  fiche: {
    idCommissionnaire: number;
    code: string;
    profil?: "COMMISSIONNAIRE" | "COLLECTEUR";
    zone?: string | null;
    statut: string;
    person?: { fullName: string; phone?: string | null; email?: string | null };
  };
  stats: {
    biensEnregistres: number;
    clientsTraites: number;
    clientsEnCours: number;
    tachesOuvertes: number;
    commissions: { enAttente: AmountsByCurrency; pretes: AmountsByCurrency; payees: AmountsByCurrency };
  };
}

export interface FieldAgentTask {
  idTask: number;
  title: string;
  description?: string | null;
  statut: "A_FAIRE" | "EN_COURS" | "EN_REVISION" | "TERMINEE";
  priorite?: string | null;
  dateEcheance?: string | null;
  createdAt: string;
}

export interface FieldAgentProperty {
  idProperty: number;
  category: "RENT" | "SALE";
  propertyType: string;
  commune?: string | null;
  quartier?: string | null;
  avenue?: string | null;
  price?: number | string | null;
  statut: string;
  createdAt: string;
  images?: { image: string }[];
}

export interface FieldAgentClient {
  idClient: number;
  dossierNumber?: string | null;
  statutPipeline: string;
  createdAt: string;
  person?: { fullName: string } | null;
}

export interface FieldAgentCommission {
  idCommission: number;
  statut: "CALCULEE" | "DUE" | "PAYEE" | "ANNULEE";
  montantCommission: number | string;
  currencyCode: string;
  createdAt: string;
  client?: { dossierNumber?: string | null } | null;
}

const get = async <T,>(url: string, fallback: string): Promise<T> => {
  try {
    const res = await api.get<{ data: T }>(url);
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, fallback));
  }
};

export const getFieldAgentOverview = () => get<FieldAgentOverview>("/api/field-agent/me", "Espace indisponible");
export const getFieldAgentTasks = () => get<FieldAgentTask[]>("/api/field-agent/tasks", "Tâches indisponibles");
export const getFieldAgentProperties = () =>
  get<FieldAgentProperty[]>("/api/field-agent/properties", "Biens indisponibles");
export const getFieldAgentClients = () => get<FieldAgentClient[]>("/api/field-agent/clients", "Clients indisponibles");
export const getFieldAgentCommissions = () =>
  get<FieldAgentCommission[]>("/api/field-agent/commissions", "Commissions indisponibles");

export const updateFieldAgentTaskStatus = async (id: number, statut: FieldAgentTask["statut"]) => {
  try {
    await api.patch(`/api/field-agent/tasks/${id}/statut`, { statut });
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Le statut n'a pas pu être modifié"));
  }
};

export const declareFieldAgentConclusion = async (id: number, note: string) => {
  try {
    const res = await api.post<{ message: string }>(`/api/field-agent/tasks/${id}/conclusion`, { note });
    return res.data.message;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "La conclusion n'a pas pu être transmise"));
  }
};

export interface AccessKeyResult {
  accessKey: string;
  link: string;
  expiresAt: string;
  email: string;
  emailQueued: boolean;
  whatsappLink: string | null;
}

export const sendCommissionnaireAccessKey = async (
  idCommissionnaire: number,
  payload: { email?: string; sendEmail: boolean }
): Promise<{ message: string; data: AccessKeyResult }> => {
  try {
    const res = await api.post(`/api/commissionnaires/${idCommissionnaire}/access-key`, payload);
    return res.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "La clé d'accès n'a pas pu être générée"));
  }
};
