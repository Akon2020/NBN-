import { Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

const OPTIONS = [
  {
    type: 'COLLECTE_BIEN' as const,
    title: 'Collecte de bien',
    description: 'Appartement, maison, terrain — avec photos et localisation',
    icon: 'home' as const,
    route: '/collecte/bien',
  },
  {
    type: 'APPORT_CLIENT' as const,
    title: 'Apport client',
    description: 'Nouveau prospect rencontré sur le terrain',
    icon: 'person-add' as const,
    route: '/collecte/client',
  },
  {
    type: 'SUIVI' as const,
    title: 'Suivi',
    description: 'Note de suivi sur une mission en cours',
    icon: 'edit-note' as const,
    route: '/collecte/suivi',
  },
];

export default function NouvelleCollecteScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            height: 36,
            width: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            backgroundColor: APP_COLORS.secondary,
          }}
        >
          <MaterialIcons name="arrow-back" size={20} color={APP_COLORS.foreground} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 20, color: APP_COLORS.foreground }}>
          Nouvelle mission
        </Text>
      </View>

      <View style={{ gap: 16, paddingHorizontal: 20, paddingTop: 16 }}>
        {OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.type}
            onPress={() => router.push(option.route as never)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              borderRadius: APP_RADIUS.lg,
              borderWidth: 1,
              borderColor: APP_COLORS.border,
              padding: 16,
            }}
          >
            <View
              style={{
                height: 48,
                width: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: APP_RADIUS.md,
                backgroundColor: APP_COLORS.secondary,
              }}
            >
              <MaterialIcons name={option.icon} size={24} color={APP_COLORS.foreground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: APP_COLORS.foreground }}>
                {option.title}
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: APP_COLORS.mutedForeground, marginTop: 2 }}>
                {option.description}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={APP_COLORS.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
