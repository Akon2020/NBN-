import api from "@/lib/axios";
import axios from "axios";
import {
  Client,
  ClientComplaint,
  ClientComplaintCreatePayload,
  ClientCreatePayload,
  ClientDossier,
  ClientUpdatePayload,
} from "@/lib/types";

export const getAllClients = async (): Promise<Client[]> => {
  try {
    const res = await api.get<{ nombre: number; data: Client[] }>("/api/clients");
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message ||
          "Erreur lors de la récupération des clients"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const getSingleClient = async (id: number): Promise<Client> => {
  try {
    const res = await api.get<Client>(`/api/clients/${id}`);
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la récupération du client"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const createClient = async (
  payload: ClientCreatePayload
): Promise<Client> => {
  try {
    const res = await api.post<{ message: string; data: Client }>(
      "/api/clients",
      payload
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la création du client"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const updateClient = async (
  id: number,
  payload: ClientUpdatePayload
): Promise<Client> => {
  try {
    const res = await api.patch<{ message: string; data: Client }>(
      `/api/clients/${id}`,
      payload
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la mise à jour du client"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const deleteClient = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/clients/${id}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la suppression du client"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

// --- GOAL 8 — vue 360 (dossier agrégé, plaintes) --------------------------

export const getClientDossier = async (id: number): Promise<ClientDossier> => {
  try {
    const res = await api.get<{ data: ClientDossier }>(`/api/clients/${id}/dossier`);
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la récupération du dossier"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const getClientComplaints = async (id: number): Promise<ClientComplaint[]> => {
  try {
    const res = await api.get<{ data: ClientComplaint[] }>(`/api/clients/${id}/complaints`);
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la récupération des plaintes"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const createComplaint = async (
  id: number,
  payload: ClientComplaintCreatePayload
): Promise<ClientComplaint> => {
  try {
    const res = await api.post<{ data: ClientComplaint }>(
      `/api/clients/${id}/complaints`,
      payload
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de l'enregistrement de la plainte"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const resolveComplaint = async (
  idClient: number,
  idComplaint: number,
  resolution?: string
): Promise<ClientComplaint> => {
  try {
    const res = await api.patch<{ data: ClientComplaint }>(
      `/api/clients/${idClient}/complaints/${idComplaint}/resolve`,
      { resolution }
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la résolution de la plainte"
      );
    }
    throw new Error("Erreur inconnue");
  }
};
