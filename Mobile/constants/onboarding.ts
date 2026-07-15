// Contenu de l'onboarding — voix de marque alignée sur le flyer NBN Express
// ("Avec NBN Express, trouver devient simple") et les quatre piliers de
// service (location, conseils, accueil & déménagement). Traitement visuel
// "hero photo" (image plein cadre + dégradé + texte en surimpression),
// inspiré des références produit partagées — remplace l'ancien traitement
// "cercle dégradé + icône" qui ne montrait aucun bien réel.
export type OnboardingSlide = {
  key: string;
  title: string;
  description: string;
  image: number;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    key: 'welcome',
    title: 'Bienvenue chez\nNBN Express',
    description:
      "Votre agence immobilière de confiance à Bukavu. Avec NBN Express, trouver devient simple.",
    image: require('@/assets/images/onboarding/slide-1.jpg'),
  },
  {
    key: 'catalog',
    title: 'Location & vente\nde biens',
    description:
      "Appartements, maisons et parcelles — une sélection fiable, vérifiée et mise à jour par nos équipes sur le terrain.",
    image: require('@/assets/images/onboarding/slide-2.jpg'),
  },
  {
    key: 'support',
    title: 'Un accompagnement\ncomplet',
    description:
      'Conseils immobiliers, accueil et déménagement — nous vous accompagnons à chaque étape de votre projet.',
    image: require('@/assets/images/onboarding/slide-3.jpg'),
  },
  {
    key: 'start',
    title: 'Prêt à\ncommencer ?',
    description: 'Connectez-vous pour accéder à votre espace NBN Express.',
    image: require('@/assets/images/onboarding/slide-4.jpg'),
  },
];
