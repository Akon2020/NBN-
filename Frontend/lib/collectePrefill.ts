import type { Bailleur } from "@/lib/types"

// Même clé de brouillon que app/collecte-bien/page.tsx : le formulaire
// restaure ce brouillon à l'ouverture.
const COLLECTE_DRAFT_KEY = "nbn-collecte-bien-v3"

/**
 * Prépare le formulaire de collecte pour un bailleur déjà enregistré (version
 * de l'agence) : le bien lui est rattaché directement, l'agent n'a plus qu'à
 * saisir le bien.
 */
export const prefillCollecteForBailleur = (bailleur: Bailleur) => {
  try {
    const current = JSON.parse(window.localStorage.getItem(COLLECTE_DRAFT_KEY) || "{}")
    window.localStorage.setItem(
      COLLECTE_DRAFT_KEY,
      JSON.stringify({
        ...current,
        remplisseur: "COLLECTEUR",
        parCommissionnaire: "NON",
        bailleurMode: "EXISTANT",
        idBailleur: String(bailleur.idBailleur),
        bailleurLabel: `${bailleur.person?.fullName || ""} (${bailleur.person?.phone || bailleur.dossierNumber || ""})`,
        bailleurPriorite: bailleur.priorite || "",
      })
    )
  } catch {
    // Stockage indisponible : le formulaire s'ouvre simplement vide.
  }
}
