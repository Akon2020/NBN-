import api from "@/lib/axios";
import axios from "axios";

export interface AppSetting<T = unknown> {
  idAppSetting: number;
  key: string;
  value: T;
  description?: string | null;
  updatedBy?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyInfo {
  name: string;
  phone: string;
  address: string;
  email: string;
}

export const getAppSettings = async (): Promise<AppSetting[]> => {
  try {
    const res = await api.get<{ data: AppSetting[] }>("/api/settings");
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la récupération des paramètres"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const updateAppSetting = async <T>(key: string, value: T): Promise<AppSetting<T>> => {
  try {
    const res = await api.patch<{ data: AppSetting<T> }>(`/api/settings/${key}`, { value });
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la mise à jour du paramètre"
      );
    }
    throw new Error("Erreur inconnue");
  }
};
