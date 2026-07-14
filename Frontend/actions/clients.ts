import api from "@/lib/axios";
import axios from "axios";
import { Client, ClientCreatePayload, ClientUpdatePayload } from "@/lib/types";

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
