import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { logout } from '@/lib/auth';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

// Écran gabarit pour le squelette de navigation par rôle (MOBILE-G01).
// Chaque écran des trois arborescences l'utilise en attendant sa vraie
// implémentation métier dans un milestone ultérieur. `showLogout` permet au
// moins un écran par arborescence de fournir une sortie réelle du login
// (MOBILE-G02) — sans ça l'utilisateur resterait connecté sans échappatoire.
// `showBrowseClient` permet de basculer vers le catalogue public sans se
// déconnecter (bascule client/portail demandée côté produit).
export function RoleScreenPlaceholder({
  title,
  description,
  showLogout = false,
  showBrowseClient = false,
}: {
  title: string;
  description: string;
  showLogout?: boolean;
  showBrowseClient?: boolean;
}) {
  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <View
      className="flex-1 items-center justify-center gap-2 px-6"
      style={{ backgroundColor: APP_COLORS.background }}
    >
      <ThemedText type="title" style={{ color: APP_COLORS.foreground }}>
        {title}
      </ThemedText>
      <ThemedText style={{ textAlign: 'center', color: APP_COLORS.mutedForeground }}>
        {description}
      </ThemedText>
      {showBrowseClient && (
        <TouchableOpacity
          onPress={() => router.push('/(client)/recherche')}
          className="mt-4 px-4 py-3"
          style={{
            borderRadius: APP_RADIUS.md,
            borderWidth: 1,
            borderColor: APP_COLORS.border,
          }}
        >
          <Text
            style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: APP_COLORS.foreground }}
          >
            Parcourir le catalogue public
          </Text>
        </TouchableOpacity>
      )}
      {showLogout && (
        <TouchableOpacity
          onPress={handleLogout}
          className="mt-2 px-4 py-3"
          style={{ borderRadius: APP_RADIUS.md, backgroundColor: APP_COLORS.destructive }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#fff' }}>
            Déconnexion
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
