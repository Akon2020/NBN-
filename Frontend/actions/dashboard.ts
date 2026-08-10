import api from "@/lib/axios";
import axios from "axios";
import { DashboardCharts, DashboardStats } from "@/lib/types";

const handleError = (error: unknown, fallback: string): never => {
  if (axios.isAxiosError(error)) {
    throw new Error(error.response?.data?.message || fallback);
  }
  throw new Error("Erreur inconnue");
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const res = await api.get<{ data: DashboardStats }>("/api/dashboard/stats");
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération des statistiques");
  }
};

export const getDashboardCharts = async (): Promise<DashboardCharts> => {
  try {
    const res = await api.get<{ data: DashboardCharts }>("/api/dashboard/charts");
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération des graphiques");
  }
};
