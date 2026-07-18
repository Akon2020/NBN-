import api from "@/lib/axios";
import axios from "axios";
import { MarginHistoryEntry, MarginSetting, PropertyType, StayType } from "@/lib/types";

export const getMarginSettings = async (): Promise<MarginSetting[]> => {
  try {
    const res = await api.get<{ data: MarginSetting[] }>("/api/margin-settings");
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la récupération des marges"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const updateMarginSetting = async (
  propertyType: PropertyType,
  stayType: StayType,
  percentage: number
): Promise<MarginSetting> => {
  try {
    const res = await api.patch<{ message: string; data: MarginSetting }>(
      `/api/margin-settings/${propertyType}`,
      { percentage, stayType }
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la mise à jour du pourcentage"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const getMarginHistory = async (): Promise<MarginHistoryEntry[]> => {
  try {
    const res = await api.get<{ data: MarginHistoryEntry[] }>("/api/margin-settings/history");
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la récupération de l'historique"
      );
    }
    throw new Error("Erreur inconnue");
  }
};
