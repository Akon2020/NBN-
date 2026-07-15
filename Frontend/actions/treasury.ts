import api from "@/lib/axios";
import axios from "axios";
import { Caisse, Currency, ExchangeRate } from "@/lib/types";

const handleError = (error: unknown, fallback: string): never => {
  if (axios.isAxiosError(error)) {
    throw new Error(error.response?.data?.message || fallback);
  }
  throw new Error("Erreur inconnue");
};

export const getAllCaisses = async (): Promise<Caisse[]> => {
  try {
    const res = await api.get<{ nombre: number; data: Caisse[] }>("/api/caisses");
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération des caisses");
  }
};

export const getSingleCaisse = async (id: number): Promise<Caisse> => {
  try {
    const res = await api.get<{ data: Caisse }>(`/api/caisses/${id}`);
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération de la caisse");
  }
};

export const createCaisse = async (payload: {
  label: string;
  responsableUserId?: number;
}): Promise<Caisse> => {
  try {
    const res = await api.post<{ data: Caisse }>("/api/caisses", payload);
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la création de la caisse");
  }
};

export const updateCaisse = async (
  id: number,
  payload: { label?: string; responsableUserId?: number; statut?: "OUVERTE" | "CLOTUREE" }
): Promise<Caisse> => {
  try {
    const res = await api.patch<{ data: Caisse }>(`/api/caisses/${id}`, payload);
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la mise à jour de la caisse");
  }
};

export const getAllCurrencies = async (): Promise<Currency[]> => {
  try {
    const res = await api.get<{ data: Currency[] }>("/api/currencies");
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération des devises");
  }
};

export const getAllExchangeRates = async (): Promise<ExchangeRate[]> => {
  try {
    const res = await api.get<{ data: ExchangeRate[] }>("/api/exchange-rates");
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération des taux de change");
  }
};

export const createExchangeRate = async (payload: {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  date: string;
  source?: string;
}): Promise<ExchangeRate> => {
  try {
    const res = await api.post<{ data: ExchangeRate }>("/api/exchange-rates", payload);
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de l'enregistrement du taux de change");
  }
};
