import { Link } from 'expo-router';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ROLES } from '@/constants/roles';

// Sélecteur de rôle "mock" (MOBILE-G01) : remplace temporairement
// l'authentification réelle pour permettre de naviguer chacune des trois
// arborescences. À remplacer par une redirection automatique post-login en
// Milestone 1 (MOBILE-G02).
export default function RoleSelectScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-6 dark:bg-neutral-900">
      <ThemedText type="title">NBN Express</ThemedText>
      <ThemedText type="subtitle" style={{ textAlign: 'center', marginBottom: 16 }}>
        Sélection de profil (mock de développement)
      </ThemedText>

      {ROLES.map((role) => (
        <Link
          key={role.href}
          href={role.href}
          className="w-full rounded-lg bg-primary-900 px-4 py-3 text-center text-base font-semibold text-white"
        >
          {role.label}
        </Link>
      ))}
    </View>
  );
}
