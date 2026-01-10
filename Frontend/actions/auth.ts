import api from "@/lib/axios";
import axios from "axios";
import Cookies from "js-cookie";
import { Auth, AuthPayload, Data, User } from "@/types/type";
import { getAuthHeaders } from "@/lib/auth";

export const login = async (data: AuthPayload): Promise<Auth> => {
  try {
    const res = await api.post("/api/auth/login", data, {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    });
    
    const { user, token } = res.data;
    
    Cookies.set("token", token, {
      expires: 7,
      secure: true,
    });
    localStorage.setItem("user", JSON.stringify(user));
    
    return {
      data: {
        token,
        userInfo: user,
      },
    } as Auth;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message || error.response?.data?.error || "Erreur lors de la connexion";
      throw new Error(message);
    }
    throw new Error("Erreur inconnue lors de la connexion");
  }
};

export const logout = async (): Promise<{ message: string }> => {
  try {
    localStorage.removeItem("user");
    Cookies.remove("token");

    const res = await api.post<{ message: string }>(
      "/api/auth/logout/",
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );

    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Erreur lors de la déconnexion"
      );
    }
    throw new Error("Erreur inconnue lors de la déconnexion");
  }
};
