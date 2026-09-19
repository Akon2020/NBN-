import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("@/actions/appSettings", () => ({ getAppSettings: vi.fn().mockResolvedValue([]) }))
vi.mock("@/actions/proposals", () => ({
  sendProposals: vi.fn().mockResolvedValue({ created: 1, total: 4, pipelineAdvanced: false }),
}))

import { WhatsAppProposalDialog } from "@/components/whatsapp-proposal-dialog"
import { sendProposals } from "@/actions/proposals"
import type { Property } from "@/lib/types"

const property = (idProperty: number, quartier: string) =>
  ({
    idProperty,
    category: "RENT",
    propertyType: "APPARTEMENT",
    quartier,
    price: 300,
    rentalDetails: { idProperty, guarantee: 2, unit: "MONTH" },
    images: [],
  }) as unknown as Property

describe("Envoi WhatsApp bien par bien", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("hors ligne")))
  })

  it("prépare un message par bien et n'enregistre que les biens envoyés au client", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null)
    const onFinished = vi.fn()
    render(
      <WhatsAppProposalDialog
        open
        onOpenChange={() => {}}
        properties={[property(1, "Nyawera"), property(2, "Ndendere")]}
        target={{ idClient: 7, fullName: "Amani Bisimwa", phone: "+243991234567" }}
        onFinished={onFinished}
      />
    )

    expect(screen.getByText("1. Appartement — Nyawera")).toBeInTheDocument()
    expect(screen.getByText("2. Appartement — Ndendere")).toBeInTheDocument()
    expect(screen.getByText("0/2 envoyé(s)")).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole("button", { name: /Texte seul au client/ })[0])
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/wa\.me\/243991234567\?text=/), "_blank")
    // Salutation uniquement dans le premier message.
    expect(decodeURIComponent(String(open.mock.calls[0][0]))).toContain("Bonjour Amani Bisimwa,")
    expect(screen.getByText("1/2 envoyé(s)")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Terminer et enregistrer" }))
    await waitFor(() => expect(onFinished).toHaveBeenCalledWith([1]))
    expect(sendProposals).toHaveBeenCalledWith({ idClient: 7, idProperties: [1], channel: "WHATSAPP" })
  })

  it("sans client, termine sans rien enregistrer", async () => {
    vi.spyOn(window, "open").mockReturnValue(null)
    const onFinished = vi.fn()
    render(<WhatsAppProposalDialog open onOpenChange={() => {}} properties={[property(3, "Kadutu")]} onFinished={onFinished} />)

    fireEvent.click(screen.getByRole("button", { name: /Texte seul/ }))
    fireEvent.click(screen.getByRole("button", { name: "Terminer" }))
    await waitFor(() => expect(onFinished).toHaveBeenCalledWith([3]))
    expect(sendProposals).not.toHaveBeenCalled()
  })
})
