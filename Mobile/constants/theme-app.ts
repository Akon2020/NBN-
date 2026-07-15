// Palette "app" — alignée sur Frontend/styles/globals.css (thème shadcn
// neutre) pour que le Mobile et le Frontend Admin partagent le même
// langage visuel sur les écrans de consultation/collecte biens. Valeurs
// hex converties depuis les oklch du Frontend (RN ne supporte pas oklch()
// nativement). Distincte de la palette de marque (`primary-900` navy,
// `accent-600` orange, CLAUDE.md §10) conservée pour l'onboarding/login,
// qui restent des écrans d'identité de marque, pas des écrans de listing.
export const APP_COLORS = {
  background: '#FFFFFF',
  foreground: '#171717',
  card: '#FFFFFF',
  cardForeground: '#171717',
  primary: '#1A1A1A',
  primaryForeground: '#FAFAFA',
  secondary: '#F5F5F5',
  secondaryForeground: '#1A1A1A',
  muted: '#F5F5F5',
  mutedForeground: '#8C8C8C',
  accent: '#F5F5F5',
  accentForeground: '#1A1A1A',
  destructive: '#DC2626',
  border: '#EBEBEB',
  ring: '#B5B5B5',
  success: '#16A34A',
  warning: '#D97706',
} as const;

export const APP_RADIUS = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
} as const;
