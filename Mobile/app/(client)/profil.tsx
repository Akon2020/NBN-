import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAccessToken } from '@/lib/secureStore';
import { getCurrentUser, logout, roleToHomeRoute, type AuthUser } from '@/lib/auth';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

const ROLE_LABELS: Record<string, string> = {
  commissionnaire: 'Commissionnaire',
  admin: 'Administrateur',
  operations: 'Opérations',
  communication: 'Communication',
  marketing: 'Marketing',
  technologique: 'Technologique',
  juridique: 'Juridique',
  tresorerie: 'Trésorerie',
  consultant: 'Consultant',
};

// Onglet "Profil" du catalogue public — sert de point d'accès unique à la
// connexion agent/commissionnaire (au lieu d'un login forcé au démarrage)
// et, une fois connecté, de bascule vers l'espace professionnel sans
// perdre la session (CDC : parcourir client et portail indifféremment).
export default function ClientProfilScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const check = async () => {
        const token = await getAccessToken();
        if (!token) {
          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }
        const current = await getCurrentUser();
        if (mounted) {
          setUser(current);
          setIsLoading(false);
        }
      };
      check();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: APP_COLORS.background }}
      >
        <ActivityIndicator color={APP_COLORS.primary} />
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: APP_COLORS.background, paddingHorizontal: 20, paddingTop: insets.top + 16 }}
    >
      <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 24, color: APP_COLORS.foreground }}>
        Profil
      </Text>

      {user ? (
        <View style={{ marginTop: 20 }}>
          <View
            style={{
              alignItems: 'center',
              gap: 8,
              borderRadius: APP_RADIUS.lg,
              backgroundColor: APP_COLORS.card,
              borderWidth: 1,
              borderColor: APP_COLORS.border,
              padding: 24,
            }}
          >
            <View
              style={{
                height: 64,
                width: 64,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                backgroundColor: APP_COLORS.primary,
              }}
            >
              <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 24, color: APP_COLORS.primaryForeground }}>
                {user.fullName?.charAt(0).toUpperCase() ?? '?'}
              </Text>
            </View>
            <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 18, color: APP_COLORS.foreground }}>
              {user.fullName}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: APP_COLORS.mutedForeground }}>
              {ROLE_LABELS[user.role] ?? user.role}
            </Text>
          </View>

          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 13,
              color: APP_COLORS.mutedForeground,
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            Vous parcourez le catalogue public tout en restant connecté à votre espace
            professionnel.
          </Text>

          <TouchableOpacity
            onPress={() => router.replace(roleToHomeRoute(user.role) as never)}
            className="flex-row items-center justify-center"
            style={{
              marginTop: 20,
              gap: 8,
              borderRadius: APP_RADIUS.md,
              backgroundColor: APP_COLORS.primary,
              paddingVertical: 14,
            }}
          >
            <MaterialIcons name="dashboard" size={18} color={APP_COLORS.primaryForeground} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: APP_COLORS.primaryForeground }}>
              Aller à mon espace professionnel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center justify-center"
            style={{
              marginTop: 12,
              gap: 8,
              borderRadius: APP_RADIUS.md,
              borderWidth: 1,
              borderColor: APP_COLORS.border,
              paddingVertical: 14,
            }}
          >
            <MaterialIcons name="logout" size={18} color={APP_COLORS.destructive} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: APP_COLORS.destructive }}>
              Déconnexion
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ marginTop: 24, alignItems: 'center' }}>
          <View
            style={{
              height: 72,
              width: 72,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              backgroundColor: `${APP_COLORS.primary}1A`,
            }}
          >
            <MaterialIcons name="badge" size={34} color={APP_COLORS.primary} />
          </View>
          <Text
            style={{
              fontFamily: 'Manrope_600SemiBold',
              fontSize: 18,
              color: APP_COLORS.foreground,
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            Vous êtes agent ou{'\n'}commissionnaire NBN Express ?
          </Text>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              color: APP_COLORS.mutedForeground,
              marginTop: 8,
              textAlign: 'center',
              paddingHorizontal: 16,
            }}
          >
            Connectez-vous pour accéder à votre espace de travail — missions terrain, biens
            internes et bien plus.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/login')}
            className="flex-row items-center justify-center"
            style={{
              marginTop: 24,
              gap: 8,
              alignSelf: 'stretch',
              borderRadius: APP_RADIUS.md,
              backgroundColor: APP_COLORS.primary,
              paddingVertical: 14,
            }}
          >
            <MaterialIcons name="login" size={18} color={APP_COLORS.primaryForeground} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: APP_COLORS.primaryForeground }}>
              Se connecter
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
