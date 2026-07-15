import api from "@/lib/axios";
import axios from "axios";
import { LedgerEntry, Payment, PaymentCreatePayload, PaymentMethod } from "@/lib/types";

const handleError = (error: unknown, fallback: string): never => {
  if (axios.isAxiosError(error)) {
    throw new Error(error.response?.data?.message || fallback);
  }
  throw new Error("Erreur inconnue");
};

export const getAllPayments = async (): Promise<Payment[]> => {
  try {
    const res = await api.get<{ nombre: number; data: Payment[] }>("/api/payments");
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération des paiements");
  }
};

export const recordPayment = async (payload: PaymentCreatePayload): Promise<Payment> => {
  try {
    const res = await api.post<{ data: Payment }>("/api/payments", payload);
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de l'enregistrement du paiement");
  }
};

export const cancelPayment = async (id: number): Promise<Payment> => {
  try {
    const res = await api.patch<{ data: Payment }>(`/api/payments/${id}/annuler`);
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de l'annulation du paiement");
  }
};

export const getLedgerEntries = async (): Promise<LedgerEntry[]> => {
  try {
    const res = await api.get<{ nombre: number; data: LedgerEntry[] }>("/api/payments/ledger");
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération du ledger");
  }
};

export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  try {
    const res = await api.get<{ nombre: number; data: PaymentMethod[] }>("/api/payments/methods");
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération des moyens de paiement");
  }
};
