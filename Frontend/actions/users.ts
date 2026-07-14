import api from "@/lib/axios";
import axios from "axios";
import { User } from "@/types/type";

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const res = await api.get<{ nombre: number; usersInfo: User[] }>(
      "/api/users"
    );
    return res.data.usersInfo;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message ||
          "Erreur lors de la récupération des utilisateurs"
      );
    }
    throw new Error("Erreur inconnue");
  }
};
