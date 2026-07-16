import api from "@/lib/axios";
import axios from "axios";

// `responseType: "blob"` fait que même une réponse d'erreur JSON (403/500)
// arrive sous forme de Blob, jamais d'objet déjà parsé — il faut le relire
// explicitement en texte avant d'en extraire `message`.
const handleError = async (error: unknown, fallback: string): Promise<never> => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data instanceof Blob) {
      let message = fallback;
      try {
        const parsed = JSON.parse(await data.text());
        message = parsed.message || fallback;
      } catch {
        // Corps non-JSON (ex. timeout réseau brut) — on garde le fallback.
      }
      throw new Error(message);
    }
    throw new Error(error.response?.data?.message || fallback);
  }
  throw new Error("Erreur inconnue");
};

// BACK-G20 — génération à la demande, jamais stockée : chaque appel
// déclenche un téléchargement direct côté navigateur, rien n'est mis en
// cache côté Frontend.
const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const downloadCaisseStatement = async (
  caisseId: number,
  from?: string,
  to?: string
): Promise<void> => {
  try {
    const res = await api.get(`/api/reports/caisses/${caisseId}/etat.pdf`, {
      params: { from, to },
      responseType: "blob",
    });
    triggerDownload(res.data, `etat-caisse-${caisseId}.pdf`);
  } catch (error) {
    await handleError(error, "Erreur lors de la génération de l'état de caisse");
  }
};

export const downloadPropertiesExport = async (format: "csv" | "xlsx"): Promise<void> => {
  try {
    const res = await api.get("/api/reports/properties", {
      params: { format },
      responseType: "blob",
    });
    triggerDownload(res.data, `biens.${format}`);
  } catch (error) {
    await handleError(error, "Erreur lors de l'export des biens");
  }
};

export const downloadCommissionsExport = async (
  format: "csv" | "xlsx",
  from?: string,
  to?: string
): Promise<void> => {
  try {
    const res = await api.get("/api/reports/commissions", {
      params: { format, from, to },
      responseType: "blob",
    });
    triggerDownload(res.data, `commissions.${format}`);
  } catch (error) {
    await handleError(error, "Erreur lors de l'export des commissions");
  }
};
