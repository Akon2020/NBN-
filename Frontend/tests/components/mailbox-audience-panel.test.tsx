import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("@/actions/inboundEmails", () => ({
  getMailboxAudiences: vi.fn(),
  updateMailboxAudience: vi.fn(),
  resetMailboxAudience: vi.fn(),
}))

import { MailboxAudiencePanel } from "@/components/mailbox-audience-panel"
import { getMailboxAudiences, resetMailboxAudience, updateMailboxAudience } from "@/actions/inboundEmails"

const contact = {
  key: "contact",
  label: "contact@nbnexpress.org",
  address: "contact@nbnexpress.org",
  roles: ["admin", "communication"],
  users: [],
  source: "env" as const,
}

describe("Audience des boîtes dans Paramètres", () => {
  beforeEach(() => vi.clearAllMocks())

  it("reste masqué pour un utilisateur qui n'est membre d'aucune boîte", async () => {
    vi.mocked(getMailboxAudiences).mockResolvedValue([])
    const { container } = render(<MailboxAudiencePanel />)
    await waitFor(() => expect(getMailboxAudiences).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it("enregistre les rôles cochés et les adresses dédoublonnées", async () => {
    vi.mocked(getMailboxAudiences).mockResolvedValue([contact])
    vi.mocked(updateMailboxAudience).mockResolvedValue({
      ...contact,
      roles: ["admin", "communication", "operations"],
      users: ["a@nbnexpress.org", "b@nbnexpress.org"],
      source: "settings",
    })
    render(<MailboxAudiencePanel />)

    expect(await screen.findByText("Réglage du serveur")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Rétablir/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText("Opérations"))
    fireEvent.change(screen.getByLabelText(/Comptes en plus/), {
      target: { value: "A@nbnexpress.org, b@nbnexpress.org; a@nbnexpress.org" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer l'audience/ }))

    await waitFor(() =>
      expect(updateMailboxAudience).toHaveBeenCalledWith("contact", {
        roles: ["admin", "communication", "operations"],
        users: ["a@nbnexpress.org", "b@nbnexpress.org"],
      })
    )
    expect(await screen.findByText("Modifiée dans Paramètres")).toBeInTheDocument()

    vi.mocked(resetMailboxAudience).mockResolvedValue(contact)
    fireEvent.click(screen.getByRole("button", { name: /Rétablir le réglage du serveur/ }))
    await waitFor(() => expect(resetMailboxAudience).toHaveBeenCalledWith("contact"))
    expect(await screen.findByText("Réglage du serveur")).toBeInTheDocument()
  })
})
