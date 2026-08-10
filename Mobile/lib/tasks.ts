import { api } from './api';

// GOAL 21 — miroir du module Tasks (GOAL 15, Backend), consommé par
// l'arborescence "Interne" (staff/admin). Le statut d'une tâche ne pilote
// jamais l'état métier d'une ressource liée (CLAUDE.md §4) — cette règle
// vit uniquement côté Backend, le Mobile ne fait qu'appeler
// PATCH /api/tasks/:id/statut comme n'importe quel client.
export type TaskStatut = 'A_FAIRE' | 'EN_COURS' | 'EN_REVISION' | 'TERMINEE';
export type TaskPriorite = 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';

export const TASK_STATUT_LABELS: Record<TaskStatut, string> = {
  A_FAIRE: 'À faire',
  EN_COURS: 'En cours',
  EN_REVISION: 'En révision',
  TERMINEE: 'Terminée',
};

export const TASK_STATUT_ORDER: TaskStatut[] = ['A_FAIRE', 'EN_COURS', 'EN_REVISION', 'TERMINEE'];

export const TASK_PRIORITE_LABELS: Record<TaskPriorite, string> = {
  BASSE: 'Basse',
  NORMALE: 'Normale',
  HAUTE: 'Haute',
  URGENTE: 'Urgente',
};

export interface Task {
  idTask: number;
  title: string;
  description?: string | null;
  statut: TaskStatut;
  priorite: TaskPriorite;
  dateEcheance?: string | null;
  createdBy: number;
  creator?: { idUser: number; fullName: string };
  assignees: { idUser: number; user?: { idUser: number; fullName: string } }[];
  createdAt: string;
  updatedAt: string;
}

export async function getAllTasks(params?: { statut?: TaskStatut; assignedToMe?: boolean }): Promise<Task[]> {
  const res = await api.get('/api/tasks', {
    params: {
      statut: params?.statut,
      assignedToMe: params?.assignedToMe ? 'true' : undefined,
    },
  });
  return res.data.data;
}

export async function updateTaskStatus(idTask: number, statut: TaskStatut): Promise<Task> {
  const res = await api.patch(`/api/tasks/${idTask}/statut`, { statut });
  return res.data.data;
}

export interface TaskInput {
  title: string;
  description?: string;
  priorite?: TaskPriorite;
  dateEcheance?: string | null;
  assigneeUserIds?: number[];
}

// POST /api/tasks (tasks:manage) — les assignés fournis sont notifiés
// automatiquement côté Backend (GOAL 15), jamais reconstruit ici.
export async function createTask(input: TaskInput): Promise<Task> {
  const res = await api.post('/api/tasks', input);
  return res.data.data;
}

// PATCH /api/tasks/:id (tasks:manage) — remplace intégralement les
// assignés fournis (même contrat que le Frontend Admin), jamais un ajout
// incrémental.
export async function updateTask(idTask: number, input: Partial<TaskInput>): Promise<Task> {
  const res = await api.patch(`/api/tasks/${idTask}`, input);
  return res.data.data;
}
