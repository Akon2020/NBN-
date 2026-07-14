import api from "@/lib/axios";
import axios from "axios";
import { Property, PropertyPayload, PropertyStatut } from "@/lib/types";

export const getAllProperties = async (): Promise<Property[]> => {
  try {
    const res = await api.get<{ nombre: number; propertiesInfo: Property[] }>(
      "/api/properties"
    );
    return res.data.propertiesInfo;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message ||
          "Erreur lors de la récupération des biens"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const getPropertiesByStatut = async (
  statut: PropertyStatut
): Promise<Property[]> => {
  try {
    const res = await api.get<{ nombre: number; propertiesInfo: Property[] }>(
      `/api/properties/statut/${statut}`
    );
    return res.data.propertiesInfo;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message ||
          "Erreur lors de la récupération des biens"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const getSingleProperty = async (id: number): Promise<Property> => {
  try {
    const res = await api.get<Property>(`/api/properties/${id}`);
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la récupération du bien"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const createProperty = async (
  payload: PropertyPayload
): Promise<Property> => {
  try {
    const res = await api.post<{ message: string; data: Property }>(
      "/api/properties",
      payload
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la création du bien"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const updateProperty = async (
  id: number,
  payload: Partial<PropertyPayload>
): Promise<Property> => {
  try {
    const res = await api.patch<{ message: string; data: Property }>(
      `/api/properties/${id}`,
      payload
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la mise à jour du bien"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const deleteProperty = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/properties/${id}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la suppression du bien"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const addPropertyImages = async (
  id: number,
  files: File[]
): Promise<void> => {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append("image", file));
    await api.post(`/api/properties/${id}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de l'ajout des images"
      );
    }
    throw new Error("Erreur inconnue");
  }
};
