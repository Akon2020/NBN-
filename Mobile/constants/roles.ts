// Sélecteur de rôle "mock" (MOBILE-G01) : source unique des trois
// arborescences de navigation, consommée par l'écran de sélection
// (app/index.tsx). Module sans dépendance React/React Native pour rester
// testable en isolation.
export const ROLES = [
  { label: 'Commissionnaire', href: '/(commissionnaire)/missions' },
  { label: 'Client', href: '/(client)/recherche' },
  { label: 'Interne (agent / admin)', href: '/(interne)/dashboard' },
] as const;
