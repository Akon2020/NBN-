import api from "@/lib/axios";
import { apiErrorMessage } from "@/lib/apiError";
import { PropertyCollectionPayload } from "@/lib/types";

// Route interne non indexée côté client, atteignable sans compte : le
// jeton est envoyé s'il existe (traçabilité du collecteur connecté), mais
// son absence n'empêche jamais la soumission.
export const submitPropertyCollection = async (
  payload: PropertyCollectionPayload
): Promise<{ idProperty: number; idMission: number | null }> => {
  try {
    const res = await api.post<{
      message: string;
      data: { idProperty: number; idMission: number | null };
    }>("/api/property-collections", payload);
    return res.data.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Erreur lors de l'enregistrement du bien"));
  }
};

// Résout le code commissionnaire du compte connecté, s'il en a un.
// Échoue silencieusement : un collecteur non connecté (ou sans fiche
// commissionnaire) saisit simplement son code à la main.
export const getMyCommissionnaireCode = async (): Promise<string | null> => {
  try {
    const res = await api.get<{ code?: string }>("/api/commissionnaires/me");
    return res.data.code || null;
  } catch {
    return null;
  }
};
