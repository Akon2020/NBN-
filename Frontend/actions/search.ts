import api from "@/lib/axios";
import axios from "axios";
import { GlobalSearchResults } from "@/lib/types";

// GOAL 18 — chaque type d'entité n'est renvoyé que si l'appelant a la
// permission de lecture correspondante (RBAC tranché côté Backend,
// jamais reconstruit ici).
export const globalSearch = async (q: string): Promise<GlobalSearchResults> => {
  try {
    const res = await api.get<{ query: string; results: GlobalSearchResults }>(
      "/api/search",
      { params: { q } }
    );
    return res.data.results;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la recherche");
    }
    throw new Error("Erreur inconnue");
  }
};
