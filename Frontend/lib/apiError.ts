import axios from "axios";

export const UNREACHABLE_MESSAGE =
  "Serveur injoignable. Vérifiez votre connexion internet puis réessayez.";

export const INSECURE_PAGE_MESSAGE =
  "Connexion non sécurisée : ouvrez le site en https://nbnexpress.org puis réessayez.";

export type ApiErrorKind =
  | "insecure"
  | "timeout"
  | "network"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "server"
  | "rejected"
  | "unknown";

// Cause probable d'un appel raté, à partir de ce que le navigateur laisse
// voir. Une erreur CORS et une coupure réseau sont indiscernables en
// JavaScript (aucune réponse dans les deux cas) : la page en http:// est le
// cas CORS connu, détecté à part.
export const classifyApiError = (error: unknown): ApiErrorKind => {
  if (!axios.isAxiosError(error)) return "unknown";
  if (!error.response) {
    if (typeof window !== "undefined" && window.location.protocol === "http:" && !/^(localhost|127\.)/.test(window.location.hostname)) {
      return "insecure";
    }
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return "timeout";
    return "network";
  }
  const status = error.response.status;
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server";
  return "rejected";
};

// Journal technique de la vraie cause, consultable depuis l'inspecteur
// (Safari iOS : Réglages > Safari > Avancé > Inspecteur web).
const logApiError = (kind: ApiErrorKind, error: unknown) => {
  if (!axios.isAxiosError(error)) return;
  console.warn("[api]", kind, {
    url: error.config?.url,
    method: error.config?.method,
    status: error.response?.status,
    code: error.code,
    online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
  });
};

// Message à montrer à l'utilisateur après un appel API raté.
// - Le Backend explique toujours son refus dans `message` : on le reprend.
// - Sans réponse, on distingue page non sécurisée, délai dépassé (API en
//   train de démarrer) et réseau coupé.
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  const kind = classifyApiError(error);
  logApiError(kind, error);
  if (!axios.isAxiosError(error)) return "Erreur inconnue";

  switch (kind) {
    case "insecure":
      return INSECURE_PAGE_MESSAGE;
    case "timeout":
      return "Le serveur met trop de temps à répondre (il redémarre peut-être). Réessayez dans quelques secondes.";
    case "network":
      return typeof navigator !== "undefined" && navigator.onLine === false
        ? "Vous êtes hors connexion. Vérifiez votre Wi-Fi ou vos données mobiles."
        : UNREACHABLE_MESSAGE;
    case "rate_limited":
      return error.response?.data?.message || "Trop de tentatives. Réessayez dans quelques minutes.";
    case "server":
      return error.response?.data?.message || "Erreur du serveur. Réessayez dans un instant ; si cela persiste, prévenez l'administrateur.";
    default:
      return error.response?.data?.message || fallback;
  }
};
