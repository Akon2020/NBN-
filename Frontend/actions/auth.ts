import api from "@/lib/axios";
import axios from "axios";
import Cookies from "js-cookie";
import { Auth, AuthPayload, Data, User } from "@/types/type";
import { getAuthHeaders } from "@/lib/auth";

export const login = async (data: AuthPayload): Promise<Auth> => {
  try {
    const res = await api.post<Auth>("/api/auth/login", data, {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    });
    Cookies.set("token", res.data.data.token, {
      expires: 7,
      secure: true,
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.error || "Erreur lors de la connexion";
      throw new Error(message);
    }
    throw new Error("Erreur inconnue lors de la connexion");
  }
};
