import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { logout } from '@/lib/auth';

// Écran gabarit pour le squelette de navigation par rôle (MOBILE-G01).
// Chaque écran des trois arborescences l'utilise en attendant sa vraie
// implémentation métier dans un milestone ultérieur. `showLogout` permet au
// moins un écran par arborescence de fournir une sortie réelle du login
// (MOBILE-G02) — sans ça l'utilisateur resterait connecté sans échappatoire.
export function RoleScreenPlaceholder({
  title,
  description,
  showLogout = false,
}: {
  title: string;
  description: string;
  showLogout?: boolean;
}) {
  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <View className="flex-1 items-center justify-center gap-2 bg-white px-6 dark:bg-neutral-900">
      <ThemedText type="title">{title}</ThemedText>
      <ThemedText style={{ textAlign: 'center' }}>{description}</ThemedText>
      {showLogout && (
        <TouchableOpacity
          onPress={handleLogout}
          className="mt-4 rounded-lg bg-error-500 px-4 py-3"
        >
          <Text className="text-base font-semibold text-white">Déconnexion</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
