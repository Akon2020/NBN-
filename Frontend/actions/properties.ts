import api from "@/lib/axios";
import axios from "axios";
import {
  Property,
  PropertyImageEntry,
  PropertyPayload,
  PropertyStatut,
  PropertyVideoEntry,
} from "@/lib/types";

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

// GOAL 1 — seul point d'entrée pour changer le statut d'un bien, jamais
// via `updateProperty` (voir property.controller.js côté Backend).
export const updatePropertyStatut = async (
  id: number,
  statut: PropertyStatut,
  note?: string
): Promise<Property> => {
  try {
    const res = await api.patch<{ message: string; data: Property }>(
      `/api/properties/${id}/statut`,
      { statut, note }
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors du changement de statut"
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
): Promise<PropertyImageEntry[]> => {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append("image", file));
    const res = await api.post<{ message: string; data: PropertyImageEntry[] }>(
      `/api/properties/${id}/images`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de l'ajout des images"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const deletePropertyImage = async (id: number, imageId: number): Promise<void> => {
  try {
    await api.delete(`/api/properties/${id}/images/${imageId}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la suppression de l'image");
    }
    throw new Error("Erreur inconnue");
  }
};

export const reorderPropertyImages = async (
  id: number,
  orderedIds: number[]
): Promise<PropertyImageEntry[]> => {
  try {
    const res = await api.patch<{ message: string; data: PropertyImageEntry[] }>(
      `/api/properties/${id}/images/reorder`,
      { orderedIds }
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la réorganisation");
    }
    throw new Error("Erreur inconnue");
  }
};

export const addPropertyVideos = async (
  id: number,
  files: File[]
): Promise<PropertyVideoEntry[]> => {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append("video", file));
    const res = await api.post<{ message: string; data: PropertyVideoEntry[] }>(
      `/api/properties/${id}/videos`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de l'ajout des vidéos"
      );
    }
    throw new Error("Erreur inconnue");
  }
};

export const deletePropertyVideo = async (id: number, videoId: number): Promise<void> => {
  try {
    await api.delete(`/api/properties/${id}/videos/${videoId}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la suppression de la vidéo");
    }
    throw new Error("Erreur inconnue");
  }
};

export const reorderPropertyVideos = async (
  id: number,
  orderedIds: number[]
): Promise<PropertyVideoEntry[]> => {
  try {
    const res = await api.patch<{ message: string; data: PropertyVideoEntry[] }>(
      `/api/properties/${id}/videos/reorder`,
      { orderedIds }
    );
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la réorganisation");
    }
    throw new Error("Erreur inconnue");
  }
};
