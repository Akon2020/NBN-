import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

// ADMIN-G01 : le jeton vit dans un cookie httpOnly posé par le backend — il
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
// session terminée) — tenter un renouvellement y créerait une boucle.
const NO_REFRESH_ROUTES = ["/api/auth/login", "/api/auth/refresh", "/api/auth/logout"];

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// Une page du dashboard lance souvent plusieurs requêtes à la fois : si le
// jeton a expiré, elles reçoivent toutes un 401. Un seul renouvellement est
// alors émis et partagé — chaque rotation révoque le refresh token
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
      // Refresh refusé : la session est vraiment terminée. On rend l'erreur
      // d'origine, ProtectedRoute redirige vers la connexion.
      return Promise.reject(error);
    }
    return api(config);
  }
);

export default api;
