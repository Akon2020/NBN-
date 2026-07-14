// Contenu de l'onboarding — voix de marque alignée sur le flyer NBN Express
// ("Avec NBN Express, trouver devient simple") et les quatre piliers de
// service (location, conseils, accueil & déménagement).
export type OnboardingSlide = {
  key: string;
  icon: 'home' | 'vpn-key' | 'groups' | 'rocket-launch';
  title: string;
  description: string;
  gradient: [string, string];
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    key: 'welcome',
    icon: 'home',
    title: 'Bienvenue chez\nNBN Express',
    description:
      "Votre agence immobilière de confiance à Bukavu. Avec NBN Express, trouver devient simple.",
    gradient: ['#14294A', '#1E3A63'],
  },
  {
    key: 'catalog',
    icon: 'vpn-key',
    title: 'Location & vente\nde biens',
    description:
      "Appartements, maisons et parcelles — une sélection fiable, vérifiée et mise à jour par nos équipes sur le terrain.",
    gradient: ['#C13F0B', '#F25414'],
  },
  {
    key: 'support',
    icon: 'groups',
    title: 'Un accompagnement\ncomplet',
    description:
      'Conseils immobiliers, accueil et déménagement — nous vous accompagnons à chaque étape de votre projet.',
    gradient: ['#245640', '#2F7350'],
  },
  {
    key: 'start',
    icon: 'rocket-launch',
    title: 'Prêt à\ncommencer ?',
    description: 'Connectez-vous pour accéder à votre espace NBN Express.',
    gradient: ['#14294A', '#245640'],
  },
];
