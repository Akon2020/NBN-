import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

// Écran gabarit pour le squelette de navigation par rôle (MOBILE-G01).
// Chaque écran des trois arborescences l'utilise en attendant sa vraie
// implémentation métier dans un milestone ultérieur.
export function RoleScreenPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-white px-6 dark:bg-neutral-900">
      <ThemedText type="title">{title}</ThemedText>
      <ThemedText style={{ textAlign: 'center' }}>{description}</ThemedText>
    </View>
  );
}
