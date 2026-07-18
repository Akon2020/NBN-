import api from "@/lib/axios";
import axios from "axios";
import { Mission } from "@/lib/types";

export const getAllMissions = async (): Promise<Mission[]> => {
  try {
    const res = await api.get<{ nombre: number; data: Mission[] }>("/api/missions");
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la récupération des missions"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const getSingleMission = async (id: number): Promise<Mission> => {
  try {
    const res = await api.get<{ data: Mission }>(`/api/missions/${id}`);
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la récupération de la mission"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

// GOAL 14 — déclaré par le commissionnaire assigné (ou missions:validate),
// distinct des transitions de validation administrative ci-dessous.
export const updateMissionProgression = async (
  id: number,
  progression: number
): Promise<Mission> => {
  try {
    const res = await api.patch<{ message: string; data: Mission }>(
      `/api/missions/${id}/progression`,
      { progression }
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la mise à jour de l'avancement"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const validateMission = async (id: number): Promise<Mission> => {
  try {
    const res = await api.patch<{ message: string; data: Mission }>(
      `/api/missions/${id}/valider`
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la validation de la mission"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const rejectMission = async (id: number, motifRejet: string): Promise<Mission> => {
  try {
    const res = await api.patch<{ message: string; data: Mission }>(
      `/api/missions/${id}/rejeter`,
      { motifRejet }
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors du rejet de la mission"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const requestMissionCorrection = async (
  id: number,
  motifRejet: string
): Promise<Mission> => {
  try {
    const res = await api.patch<{ message: string; data: Mission }>(
      `/api/missions/${id}/demander-correction`,
      { motifRejet }
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la demande de correction"
      );
    }
    throw new Error("Erreur inconnue");
  }
};
