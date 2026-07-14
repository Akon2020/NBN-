import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("affiche son contenu", () => {
    render(<Button>Se connecter</Button>);
    expect(screen.getByText("Se connecter")).toBeInTheDocument();
  });
});
