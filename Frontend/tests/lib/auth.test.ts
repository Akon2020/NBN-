import { describe, it, expect, beforeEach } from "vitest";
import { getAuthUser } from "@/lib/auth";

describe("getAuthUser", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("retourne null si aucun utilisateur n'est en cache", () => {
    expect(getAuthUser()).toBeNull();
  });

  it("retourne l'utilisateur mis en cache par le flux de login", () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ idUser: 1, fullName: "Test User", role: "admin" })
    );

    const user = getAuthUser();
    expect(user?.fullName).toBe("Test User");
    expect(user?.role).toBe("admin");
  });
});
