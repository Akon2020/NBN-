import type { Bailleur } from "@/lib/types"

// Même clé de brouillon que app/collecte-bien/page.tsx : le formulaire
// restaure ce brouillon à l'ouverture.
const COLLECTE_DRAFT_KEY = "nbn-collecte-bien-v2"

/**
 * Prépare le formulaire de collecte pour un bailleur déjà enregistré :
 * l'agent n'a plus qu'à saisir le bien. Le Backend rattache la collecte à ce
 * bailleur par son téléphone (jamais de doublon).
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
        responsableStatut: bailleur.type,
        responsableNom: bailleur.person?.fullName || "",
        responsablePhone: bailleur.person?.phone || "",
        responsableEmail: bailleur.person?.email || "",
        responsableIdNumber: bailleur.person?.idNumber || "",
      })
    )
  } catch {
    // Stockage indisponible : le formulaire s'ouvre simplement vide.
  }
}
