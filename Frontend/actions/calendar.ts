import api from "@/lib/axios";
import axios from "axios";
import { CalendarEntry } from "@/lib/types";

const handleError = (error: unknown, fallback: string): never => {
  if (axios.isAxiosError(error)) {
    throw new Error(error.response?.data?.message || fallback);
  }
  throw new Error("Erreur inconnue");
};

export const getCalendarEvents = async (from?: string, to?: string): Promise<CalendarEntry[]> => {
  try {
    const res = await api.get<{ nombre: number; data: CalendarEntry[] }>("/api/calendar", {
      params: { from, to },
    });
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération du calendrier");
  }
};

export const createCalendarEvent = async (payload: {
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  participantUserIds?: number[];
}): Promise<CalendarEntry> => {
  try {
    const res = await api.post<{ data: CalendarEntry }>("/api/calendar", payload);
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la création du rendez-vous");
  }
};

// GOAL 11 — modification d'un rendez-vous existant, notamment sa liste de
// participants (chaque ajout notifie la personne concernée côté Backend).
export const updateCalendarEvent = async (
  id: number,
  payload: {
    title?: string;
    description?: string;
    startAt?: string;
    endAt?: string;
    participantUserIds?: number[];
  }
): Promise<CalendarEntry> => {
  try {
    const res = await api.patch<{ data: CalendarEntry }>(`/api/calendar/${id}`, payload);
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la modification du rendez-vous");
  }
};

export const deleteCalendarEvent = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/calendar/${id}`);
  } catch (error) {
    handleError(error, "Erreur lors de la suppression du rendez-vous");
  }
};
