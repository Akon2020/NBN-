import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("@/actions/bailleurs", () => ({
  getAllBailleurs: vi.fn().mockResolvedValue([
    {
      idBailleur: 1,
      type: "PROPRIETAIRE",
      statutRelation: "ACTIF",
      dossierNumber: "BAI-2026-000001",
      // Bailleur arrivé par le formulaire de collecte : marge pas encore fixée.
      margeAgence: null,
      person: { fullName: "Bailleur Collecté", phone: "+243970000000" },
    },
    {
      idBailleur: 2,
      type: "MANDATAIRE",
      statutRelation: "ACTIF",
      // MySQL renvoie les DECIMAL sous forme de chaîne.
      margeAgence: "150.00",
      person: { fullName: "Bailleur Avec Marge" },
    },
  ]),
}));

import BailleursPage from "@/app/dashboard/bailleurs/page";

describe("Onglet Bailleurs", () => {
  it("s'affiche même quand un bailleur n'a pas encore de marge", async () => {
    render(<BailleursPage />);

    expect(await screen.findByText("Bailleur Collecté")).toBeInTheDocument();
    expect(screen.getByText("Bailleur Avec Marge")).toBeInTheDocument();
    expect(screen.getByText(/Marge : \$150/)).toBeInTheDocument();
  });
});
