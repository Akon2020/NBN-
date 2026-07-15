// Palette "app" — alignée sur la palette de marque réellement utilisée par
// le Frontend Admin (Frontend/app/globals.css, le fichier effectivement
// importé par app/layout.tsx — Frontend/styles/globals.css est un résidu
// de scaffold inutilisé, jamais importé nulle part, à ne plus utiliser
// comme référence). Orange chaud en primaire, vert profond en secondaire,
// rouge en accent/destructif : c'est la vraie identité visuelle du site,
// pas un thème shadcn neutre générique.
export const APP_COLORS = {
  background: '#FFFFFF',
  foreground: '#141716',
  card: '#FFFFFF',
  cardForeground: '#141716',
  primary: '#FC963C',
  primaryForeground: '#FFFFFF',
  secondary: '#2C6F5D',
  secondaryForeground: '#FFFFFF',
  muted: '#F5F5F5',
  mutedForeground: '#6B7280',
  accent: '#FE3F3F',
  accentForeground: '#FFFFFF',
  destructive: '#FE3F3F',
  destructiveForeground: '#FFFFFF',
  border: '#E5E7EB',
  ring: '#FC963C',
  // Sémantique distincte de la palette décorative — un succès n'est pas
  // "secondary" par coïncidence, il doit rester lisible même si la marque
  // change de vert un jour.
  success: '#2F7350',
  warning: '#F59E0B',
} as const;

export const APP_RADIUS = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
} as const;
