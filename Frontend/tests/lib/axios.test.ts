import { describe, it, expect, beforeEach } from "vitest";
import { AxiosError, InternalAxiosRequestConfig } from "axios";
import api, { SESSION_EXPIRED_EVENT } from "@/lib/axios";

type Handler = (config: InternalAxiosRequestConfig) => { status: number; data?: unknown };

// Adaptateur factice : chaque requête passe par `handler`, ce qui permet de
// simuler l'expiration du jeton sans serveur.
const calls: string[] = [];
let handler: Handler;

api.defaults.adapter = async (config) => {
  calls.push(config.url ?? "");
  const { status, data } = handler(config);
  const response = { status, statusText: "", headers: {}, config, data };
  if (status >= 400) {
    throw new AxiosError("fail", "ERR", config, {}, response);
  }
  return response;
};

describe("api — renouvellement silencieux de la session", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("renouvelle le jeton puis rejoue la requête après un 401", async () => {
    let tokenValid = false;
    handler = (config) => {
      if (config.url === "/api/auth/refresh/") {
        tokenValid = true;
        return { status: 200 };
      }
      return tokenValid ? { status: 200, data: { ok: true } } : { status: 401 };
    };

    const res = await api.get("/api/bailleurs");

    expect(res.data).toEqual({ ok: true });
    expect(calls).toEqual(["/api/bailleurs", "/api/auth/refresh/", "/api/bailleurs"]);
  });

  it("n'émet qu'un seul renouvellement pour des requêtes simultanées", async () => {
    let tokenValid = false;
    handler = (config) => {
      if (config.url === "/api/auth/refresh/") {
        tokenValid = true;
        return { status: 200 };
      }
      return tokenValid ? { status: 200 } : { status: 401 };
    };

    await Promise.all([api.get("/api/clients"), api.get("/api/bailleurs"), api.get("/api/tasks")]);

    expect(calls.filter((url) => url === "/api/auth/refresh/")).toHaveLength(1);
  });

  it("rend l'erreur d'origine si la session est vraiment terminée", async () => {
    handler = () => ({ status: 401 });

    await expect(api.get("/api/auth/profile/")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(calls).toEqual(["/api/auth/profile/", "/api/auth/refresh/"]);
  });

  it("ne tente jamais de renouvellement sur un échec de connexion", async () => {
    handler = () => ({ status: 401 });

    await expect(api.post("/api/auth/login/", {})).rejects.toBeInstanceOf(AxiosError);
    expect(calls).toEqual(["/api/auth/login/"]);
  });

  it("prévient l'application quand la session est terminée", async () => {
    handler = () => ({ status: 401 });
    let expired = 0;
    const onExpired = () => (expired += 1);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    await expect(api.get("/api/clients")).rejects.toBeInstanceOf(AxiosError);
    window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    expect(expired).toBe(1);
  });
});

describe("api - nouvel essai sans réponse", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("rejoue une seule fois une lecture restée sans réponse", async () => {
    let attempts = 0;
    api.defaults.adapter = async (config) => {
      calls.push(config.url ?? "");
      attempts += 1;
      if (attempts === 1) throw new AxiosError("Network Error", "ERR_NETWORK", config);
      return { status: 200, statusText: "", headers: {}, config, data: { ok: true } };
    };
    const res = await api.get("/api/properties");
    expect(res.data).toEqual({ ok: true });
    expect(calls).toEqual(["/api/properties", "/api/properties"]);
  });

  it("ne rejoue jamais un envoi de données", async () => {
    api.defaults.adapter = async (config) => {
      calls.push(config.url ?? "");
      throw new AxiosError("Network Error", "ERR_NETWORK", config);
    };
    await expect(api.post("/api/property-collections", {})).rejects.toBeInstanceOf(AxiosError);
    expect(calls).toEqual(["/api/property-collections"]);
  });
});
