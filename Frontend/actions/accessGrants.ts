import api from "@/lib/axios";
import axios from "axios";
import { AccessGrant, Permission } from "@/types/type";

export const getAllPermissions = async (): Promise<Permission[]> => {
  try {
    const res = await api.get<{ nombre: number; data: Permission[] }>(
      "/api/permissions"
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message ||
          "Erreur lors de la récupération des permissions"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const getAllAccessGrants = async (): Promise<AccessGrant[]> => {
  try {
    const res = await api.get<{ nombre: number; data: AccessGrant[] }>(
      "/api/access-grants"
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message ||
          "Erreur lors de la récupération des accès"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const createAccessGrant = async (payload: {
  idUser: number;
  permissionKey: string;
  reason: string;
  expiresAt?: string;
}): Promise<AccessGrant> => {
  try {
    const res = await api.post<{ message: string; data: AccessGrant }>(
      "/api/access-grants",
      payload
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la création de l'accès"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const revokeAccessGrant = async (id: number): Promise<AccessGrant> => {
  try {
    const res = await api.patch<{ message: string; data: AccessGrant }>(
      `/api/access-grants/${id}/revoke`
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la révocation de l'accès"
      );
    }
    throw new Error("Erreur inconnue");
  }
};
