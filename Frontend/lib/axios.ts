import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

// ADMIN-G01 : le jeton vit dans un cookie httpOnly posé par le backend - il
// n'est jamais lisible en JS. `withCredentials: true` suffit à l'envoyer
// automatiquement à chaque requête, plus besoin de reconstruire un header
// Authorization à partir d'un cookie côté client.
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Routes où un 401 est une vraie réponse métier (identifiants refusés,
// session terminée) - tenter un renouvellement y créerait une boucle.
const NO_REFRESH_ROUTES = [
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/token",
];

type RetriableConfig = InternalAxiosRequestConfig & {
  _retried?: boolean;
  _networkRetried?: boolean;
};

// Événement diffusé quand la session est réellement terminée (jeton expiré
// et renouvellement refusé) : ProtectedRoute masque aussitôt le contenu et
// renvoie vers la connexion, sans laisser une page à moitié chargée.
export const SESSION_EXPIRED_EVENT = "nbn:session-expired";

const notifySessionExpired = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("user");
  } catch {
    // Stockage indisponible (navigation privée) : sans effet sur la suite.
  }
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
};

// Lectures et connexion : délai borné, et un seul nouvel essai si aucune
// réponse n'arrive (API qui redémarre après une mise en veille, réseau
// mobile qui hésite). Les envois (fichiers, vidéos) ne sont jamais rejoués
// ni bornés : sur une connexion lente, un envoi long reste légitime.
const READ_TIMEOUT_MS = 30000;
const isReplayable = (config?: InternalAxiosRequestConfig) =>
  !!config &&
  ((config.method ?? "get").toLowerCase() === "get" ||
    (config.url ?? "").startsWith("/api/auth/login"));

api.interceptors.request.use((config) => {
  if (isReplayable(config) && !config.timeout) config.timeout = READ_TIMEOUT_MS;
  return config;
});

// Une page du dashboard lance souvent plusieurs requêtes à la fois : si le
// jeton a expiré, elles reçoivent toutes un 401. Un seul renouvellement est
// alors émis et partagé - chaque rotation révoque le refresh token
// précédent, deux appels concurrents se feraient passer pour une
// réutilisation frauduleuse et déconnecteraient l'utilisateur.
let refreshInFlight: Promise<void> | null = null;

export const refreshSession = (): Promise<void> => {
  if (!refreshInFlight) {
    refreshInFlight = api
      .post("/api/auth/refresh/", {}, { withCredentials: true })
      .then(() => undefined)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const url = config?.url ?? "";

    if (!error.response && config && !config._networkRetried && isReplayable(config)) {
      config._networkRetried = true;
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return api(config);
    }

    if (
      error.response?.status !== 401 ||
      !config ||
      config._retried ||
      NO_REFRESH_ROUTES.some((route) => url.startsWith(route))
    ) {
      return Promise.reject(error);
    }

    config._retried = true;
    try {
      await refreshSession();
    } catch {
      // Refresh refusé : la session est vraiment terminée.
      notifySessionExpired();
      return Promise.reject(error);
    }
    return api(config);
  }
);

export default api;
