import api from "@/lib/axios";
import axios from "axios";
import { TimelineEntityType, TimelineEvent } from "@/lib/types";

const handleError = (error: unknown, fallback: string): never => {
  if (axios.isAxiosError(error)) {
    throw new Error(error.response?.data?.message || fallback);
  }
  throw new Error("Erreur inconnue");
};

export const getEntityTimeline = async (
  entityType: TimelineEntityType,
  entityId: number,
  eventType?: string
): Promise<TimelineEvent[]> => {
  try {
    const res = await api.get<{ nombre: number; data: TimelineEvent[] }>(
      `/api/timeline/${entityType}/${entityId}`,
      { params: eventType ? { eventType } : undefined }
    );
    return res.data.data;
  } catch (error) {
    return handleError(error, "Erreur lors de la récupération de la timeline");
  }
};
