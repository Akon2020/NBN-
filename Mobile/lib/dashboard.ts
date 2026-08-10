import { api } from './api';

// GOAL 21 — miroir de GET /api/dashboard/stats (déjà réel côté Backend
// depuis ADMIN-G00, chaque bloc filtré par la permission de lecture de
// l'appelant — jamais reconstruit côté Mobile, CLAUDE.md §2.2).
export interface RecentActivityEntry {
  type: 'PROPERTY' | 'CLIENT' | 'MISSION' | 'REQUISITION';
  id: number;
  label: string;
  detail?: string | null;
  date: string;
}

export interface DashboardStats {
  properties: { rentals: number; sales: number; totalImages: number };
  favorites: number;
  clients?: number;
  proposals?: number;
  activeUsers?: number;
  pendingMissions?: number;
  pendingRequisitions?: number;
  openCaisses?: number;
  pendingCommissions?: number;
  recentActivity: RecentActivityEntry[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await api.get('/api/dashboard/stats');
  return res.data.data;
}
