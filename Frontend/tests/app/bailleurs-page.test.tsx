import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

// La fenêtre « Ajouter un bailleur » navigue vers la collecte après création.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("@/actions/bailleurs", () => ({
  getAllBailleurs: vi.fn().mockResolvedValue([
    {
      idBailleur: 1,
      type: "PROPRIETAIRE",
      priorite: "STANDARD",
      propertiesCount: 2,
      statutRelation: "ACTIF",
      dossierNumber: "BAI-2026-000001",
      // Bailleur arrivé par le formulaire de collecte : marge pas encore fixée.
      margeAgence: null,
      person: { fullName: "Bailleur Collecté", phone: "+243970000000" },
    },
    {
      idBailleur: 2,
      type: "MANDATAIRE",
      priorite: "VIP",
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

  it("affiche le VIP en premier, avec le nombre de biens et les boutons Aperçu / Profil", async () => {
    render(<BailleursPage />);

    const names = (await screen.findAllByRole("heading", { level: 3 })).map((heading) => heading.textContent);
    expect(names).toEqual(["Bailleur Avec Marge", "Bailleur Collecté"]);
    expect(screen.getByText("2 bien(s)")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Aperçu/ })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /Profil/ })[0]).toHaveAttribute("href", "/dashboard/bailleurs/2");
  });
});
