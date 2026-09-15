import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import {
  LocationFields,
  resolveAvenues,
  validateLocation,
  type LocationValue,
} from "@/components/forms/location-fields"

const empty: LocationValue = { commune: "", quartier: "", avenues: [], avenueAutre: "" }

describe("LocationFields", () => {
  it("ne propose que les quartiers de la commune choisie", () => {
    render(
      <LocationFields value={{ ...empty, commune: "IBANDA" }} onChange={() => {}} required />
    )

    expect(screen.getByRole("button", { name: "Nyalukemba" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Nyamugo" })).not.toBeInTheDocument()
  })

  it("changer de commune vide le quartier et les avenues", () => {
    const onChange = vi.fn()
    render(
      <LocationFields
        value={{ commune: "IBANDA", quartier: "Panzi", avenues: ["Kasiye"], avenueAutre: "" }}
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Kadutu" }))

    expect(onChange).toHaveBeenCalledWith({
      commune: "KADUTU",
      quartier: "",
      avenues: [],
      avenueAutre: "",
    })
  })
})

describe("validateLocation / resolveAvenues", () => {
  it("exige commune, quartier et au moins une avenue", () => {
    expect(validateLocation(empty)).toMatch(/commune/)
    expect(validateLocation({ ...empty, commune: "IBANDA" })).toMatch(/quartier/)
    expect(validateLocation({ ...empty, commune: "IBANDA", quartier: "Panzi" })).toMatch(/avenue/)
    expect(
      validateLocation({ commune: "IBANDA", quartier: "Panzi", avenues: ["Kasiye"], avenueAutre: "" })
    ).toBeNull()
  })

  it("remplace « Autre avenue » par le texte saisi, et l'exige", () => {
    const withOther = { commune: "IBANDA", quartier: "Panzi", avenues: ["Kasiye", "AUTRE"], avenueAutre: "" }
    expect(validateLocation({ ...withOther, avenues: ["AUTRE"] })).toMatch(/Précisez/)
    expect(resolveAvenues({ ...withOther, avenueAutre: " Av. du Marché " })).toEqual([
      "Kasiye",
      "Av. du Marché",
    ])
  })
})
