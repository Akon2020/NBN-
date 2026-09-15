import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";

vi.mock("@/lib/axios", () => ({
  default: { post: vi.fn() },
}));

import api from "@/lib/axios";
import { login } from "@/actions/auth";

const axiosErrorWith = (status?: number, data?: unknown) => {
  const config = { headers: new AxiosHeaders() };
  const response =
    status === undefined
      ? undefined
      : { status, statusText: "", headers: {}, config, data };
  return new AxiosError("Request failed", "ERR", config, {}, response);
};

describe("login — message affiché en cas d'échec", () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it("reprend l'explication renvoyée par le Backend", async () => {
    vi.mocked(api.post).mockRejectedValue(
      axiosErrorWith(429, {
        message: "Trop de tentatives. Veuillez réessayer dans quelques minutes.",
      })
    );

    await expect(login({ email: "a@b.cd", password: "x" })).rejects.toThrow(
      "Trop de tentatives"
    );
  });

  it("signale un serveur injoignable plutôt qu'un mot de passe faux", async () => {
    vi.mocked(api.post).mockRejectedValue(axiosErrorWith());

    await expect(login({ email: "a@b.cd", password: "x" })).rejects.toThrow(
      "Serveur injoignable"
    );
  });
});
