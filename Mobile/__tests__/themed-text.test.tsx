import { render } from "@testing-library/react-native";
import { ThemedText } from "@/components/themed-text";

describe("ThemedText", () => {
  it("affiche son contenu", async () => {
    const { getByText } = await render(<ThemedText>Bonjour NBN</ThemedText>);
    expect(getByText("Bonjour NBN")).toBeTruthy();
  });
});
