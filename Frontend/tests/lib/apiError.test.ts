import { describe, it, expect } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { apiErrorMessage, UNREACHABLE_MESSAGE } from "@/lib/apiError";

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

  it("utilise le repli si la réponse n'explique rien", () => {
    const error = new AxiosError("fail", "ERR", config, {}, {
      status: 502,
      statusText: "",
      headers: {},
      config,
      data: "<html>Bad Gateway</html>",
    });
    expect(apiErrorMessage(error, "Erreur lors de l'enregistrement du bien")).toBe(
      "Erreur lors de l'enregistrement du bien"
    );
  });
});
