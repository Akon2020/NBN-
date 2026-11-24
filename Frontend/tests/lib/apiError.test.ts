import { describe, it, expect } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { apiErrorMessage, classifyApiError, UNREACHABLE_MESSAGE } from "@/lib/apiError";

const config = { headers: new AxiosHeaders() };

describe("apiErrorMessage", () => {
  it("reprend le message du Backend", () => {
    const error = new AxiosError("fail", "ERR", config, {}, {
      status: 400,
      statusText: "",
      headers: {},
      config,
      data: { message: "La commune est requise." },
    });
    expect(apiErrorMessage(error, "fallback")).toBe("La commune est requise.");
  });

  it("signale un serveur injoignable quand aucune réponse n'arrive", () => {
    const error = new AxiosError("Network Error", "ERR_NETWORK", config, {});
    expect(apiErrorMessage(error, "fallback")).toBe(UNREACHABLE_MESSAGE);
  });

  it("utilise le repli si un refus n'explique rien", () => {
    const error = new AxiosError("fail", "ERR", config, {}, {
      status: 400,
      statusText: "",
      headers: {},
      config,
      data: "<html>Bad Request</html>",
    });
    expect(apiErrorMessage(error, "Erreur lors de l'enregistrement du bien")).toBe(
      "Erreur lors de l'enregistrement du bien"
    );
  });

  it("distingue une erreur du serveur, un quota et un délai dépassé", () => {
    const response = (status: number) => ({ status, statusText: "", headers: {}, config, data: "" });
    expect(classifyApiError(new AxiosError("x", "ERR", config, {}, response(502)))).toBe("server");
    expect(classifyApiError(new AxiosError("x", "ERR", config, {}, response(429)))).toBe("rate_limited");
    expect(classifyApiError(new AxiosError("x", "ERR", config, {}, response(401)))).toBe("unauthorized");
    expect(classifyApiError(new AxiosError("timeout", "ECONNABORTED", config, {}))).toBe("timeout");
    expect(apiErrorMessage(new AxiosError("x", "ERR", config, {}, response(502)), "repli")).toMatch(/Erreur du serveur/);
    expect(apiErrorMessage(new AxiosError("x", "ERR", config, {}, response(429)), "repli")).toMatch(/Trop de tentatives/);
  });
});
