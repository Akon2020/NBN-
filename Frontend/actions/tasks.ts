import api from "@/lib/axios";
import axios from "axios";
import { Task, TaskComment, TaskPriorite, TaskStatut } from "@/lib/types";

export interface TaskInput {
  title: string;
  description?: string | null;
  priorite?: TaskPriorite;
  dateEcheance?: string | null;
  assigneeUserIds?: number[];
  idProperties?: number[];
  idClients?: number[];
  idBailleurs?: number[];
  idCommissionnaires?: number[];
}

export const getAllTasks = async (): Promise<Task[]> => {
  try {
    const res = await api.get<{ nombre: number; data: Task[] }>("/api/tasks");
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la récupération des tâches");
    }
    throw new Error("Erreur inconnue");
  }
};

export const getSingleTask = async (id: number): Promise<Task> => {
  try {
    const res = await api.get<{ data: Task }>(`/api/tasks/${id}`);
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la récupération de la tâche");
    }
    throw new Error("Erreur inconnue");
  }
};

export const createTask = async (input: TaskInput): Promise<Task> => {
  try {
    const res = await api.post<{ message: string; data: Task }>("/api/tasks", input);
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la création de la tâche");
    }
    throw new Error("Erreur inconnue");
  }
};

export const updateTask = async (id: number, input: Partial<TaskInput>): Promise<Task> => {
  try {
    const res = await api.patch<{ message: string; data: Task }>(`/api/tasks/${id}`, input);
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la mise à jour de la tâche");
    }
    throw new Error("Erreur inconnue");
  }
};

export const updateTaskStatus = async (id: number, statut: TaskStatut): Promise<Task> => {
  try {
    const res = await api.patch<{ message: string; data: Task }>(`/api/tasks/${id}/statut`, {
      statut,
    });
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors du changement de statut");
    }
    throw new Error("Erreur inconnue");
  }
};

export const deleteTask = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/tasks/${id}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la suppression de la tâche");
    }
    throw new Error("Erreur inconnue");
  }
};

export const getTaskComments = async (id: number): Promise<TaskComment[]> => {
  try {
    const res = await api.get<{ nombre: number; data: TaskComment[] }>(`/api/tasks/${id}/comments`);
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la récupération des commentaires");
    }
    throw new Error("Erreur inconnue");
  }
};

export const addTaskComment = async (id: number, content: string): Promise<TaskComment> => {
  try {
    const res = await api.post<{ message: string; data: TaskComment }>(`/api/tasks/${id}/comments`, {
      content,
    });
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de l'ajout du commentaire");
    }
    throw new Error("Erreur inconnue");
  }
};

export const deleteTaskComment = async (id: number, commentId: number): Promise<void> => {
  try {
    await api.delete(`/api/tasks/${id}/comments/${commentId}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la suppression du commentaire");
    }
    throw new Error("Erreur inconnue");
  }
};
