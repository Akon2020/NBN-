import api from "@/lib/axios";
import axios from "axios";
import { Notification } from "@/lib/types";

const handleError = (error: unknown, fallback: string): never => {
  if (axios.isAxiosError(error)) {
    throw new Error(error.response?.data?.message || fallback);
  }
  throw new Error("Erreur inconnue");
};

export const getMyNotifications = async (): Promise<Notification[]> => {
  try {
    const res = await api.get<{ nombre: number; data: Notification[] }>("/api/notifications/me");
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération des notifications");
  }
};

export const markNotificationRead = async (id: number): Promise<Notification> => {
  try {
    const res = await api.patch<{ data: Notification }>(`/api/notifications/${id}/lue`);
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors du marquage de la notification");
  }
};
