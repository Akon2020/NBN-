import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { logout } from '@/lib/auth';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

interface CommissionnaireProfile {
  idCommissionnaire: number;
  code: string;
  zone: string | null;
  niveau: 'JUNIOR' | 'CONFIRME' | 'SENIOR';
  statut: 'ACTIF' | 'OBSERVATION' | 'SUSPENDU' | 'EXCLU';
  scoreGlobal: string;
  classement: 'ELITE' | 'TRES_PERFORMANT' | 'MOYEN' | 'RISQUE';
  person?: { fullName: string };
}

const NIVEAU_LABELS: Record<CommissionnaireProfile['niveau'], string> = {
  JUNIOR: 'Junior',
  CONFIRME: 'Confirmé',
  SENIOR: 'Senior',
};

const CLASSEMENT_LABELS: Record<CommissionnaireProfile['classement'], string> = {
  ELITE: 'Élite',
  TRES_PERFORMANT: 'Très performant',
  MOYEN: 'Moyen',
  RISQUE: 'Risque',
};

// Couleurs sémantiques (statut de performance), pas des couleurs de thème
// décoratives — conservées distinctes de la palette "app" neutre.
const CLASSEMENT_COLORS: Record<CommissionnaireProfile['classement'], string> = {
  ELITE: APP_COLORS.success,
  TRES_PERFORMANT: APP_COLORS.success,
  MOYEN: APP_COLORS.warning,
  RISQUE: APP_COLORS.destructive,
};

export default function ProfilCommissionnaireScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<CommissionnaireProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      api
        .get('/api/commissionnaires/me')
        .then((res) => {
          if (mounted) setProfile(res.data);
        })
        .catch(() => {
          if (mounted) setProfile(null);
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });
      return () => {
        mounted = false;
      };
    }, [])
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: APP_COLORS.background }}>
        <ActivityIndicator color={APP_COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background, paddingHorizontal: 20, paddingTop: insets.top + 16 }}>
      <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 24, color: APP_COLORS.foreground, marginBottom: 16 }}>
        Profil
      </Text>
      {profile ? (
        <>
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
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 24, color: APP_COLORS.primaryForeground }}>
                {profile.person?.fullName?.charAt(0).toUpperCase() ?? '?'}
              </Text>
            </View>
            <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 18, color: APP_COLORS.foreground }}>
              {profile.person?.fullName}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: APP_COLORS.mutedForeground }}>
              {profile.code} {profile.zone ? `— ${profile.zone}` : ''}
            </Text>
          </View>

          <View style={{ marginTop: 16, flexDirection: 'row', gap: 12 }}>
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                gap: 4,
                borderRadius: APP_RADIUS.lg,
                backgroundColor: APP_COLORS.card,
                borderWidth: 1,
                borderColor: APP_COLORS.border,
                padding: 16,
              }}
            >
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: APP_COLORS.mutedForeground }}>
                Niveau
              </Text>
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 16, color: APP_COLORS.foreground }}>
                {NIVEAU_LABELS[profile.niveau]}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                gap: 4,
                borderRadius: APP_RADIUS.lg,
                backgroundColor: APP_COLORS.card,
                borderWidth: 1,
                borderColor: APP_COLORS.border,
                padding: 16,
              }}
            >
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: APP_COLORS.mutedForeground }}>
                Score
              </Text>
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 16, color: APP_COLORS.foreground }}>
                {Number(profile.scoreGlobal).toFixed(0)}/100
              </Text>
            </View>
          </View>

          <View
            style={{
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderRadius: APP_RADIUS.lg,
              padding: 16,
              backgroundColor: `${CLASSEMENT_COLORS[profile.classement]}19`,
            }}
          >
            <MaterialIcons name="military-tech" size={20} color={CLASSEMENT_COLORS[profile.classement]} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: CLASSEMENT_COLORS[profile.classement] }}>
              Classement : {CLASSEMENT_LABELS[profile.classement]}
            </Text>
          </View>
        </>
      ) : (
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 64 }}>
          <MaterialIcons name="person-off" size={40} color={APP_COLORS.mutedForeground} />
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: APP_COLORS.mutedForeground }}>
            Aucune fiche commissionnaire liée à ce compte
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={() => router.push('/(client)/recherche')}
        style={{
          marginTop: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: APP_COLORS.border,
          paddingVertical: 14,
        }}
      >
        <MaterialIcons name="storefront" size={18} color={APP_COLORS.foreground} />
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: APP_COLORS.foreground }}>
          Parcourir le catalogue public
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleLogout}
        style={{
          marginTop: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: 14,
          backgroundColor: APP_COLORS.destructive,
          paddingVertical: 14,
        }}
      >
        <MaterialIcons name="logout" size={18} color="#fff" />
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#fff' }}>Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
}
