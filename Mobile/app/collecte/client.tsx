import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createDraftMission } from '@/lib/repository/missionRepository';
import { syncPendingMissions } from '@/lib/sync/syncEngine';
import type { ClientPayload } from '@/lib/missions';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

const TYPES: { value: ClientPayload['type']; label: string }[] = [
  { value: 'LOCATAIRE', label: 'Locataire' },
  { value: 'ACHETEUR', label: 'Acheteur' },
];

const inputStyle = {
  fontFamily: 'Inter_400Regular',
  fontSize: 15,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: APP_COLORS.border,
  paddingHorizontal: 16,
  paddingVertical: 12,
  color: APP_COLORS.foreground,
} as const;

export default function ClientCollecteScreen() {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<ClientPayload['type']>('LOCATAIRE');
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = fullName.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      const payload: ClientPayload = {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        type,
        source: 'TERRAIN',
      };
      await createDraftMission('APPORT_CLIENT', payload);
      syncPendingMissions().catch(() => {});
      router.replace('/missions' as never);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ height: 36, width: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: APP_COLORS.muted }}
        >
          <MaterialIcons name="arrow-back" size={20} color={APP_COLORS.foreground} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 20, color: APP_COLORS.foreground }}>
          Apport client
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: APP_COLORS.mutedForeground }}>
            Nom complet *
          </Text>
          <TextInput
            placeholder="Ex : Jean Mukendi"
            placeholderTextColor={APP_COLORS.mutedForeground}
            value={fullName}
            onChangeText={setFullName}
            style={inputStyle}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: APP_COLORS.mutedForeground }}>
            Téléphone
          </Text>
          <TextInput
            placeholder="+243 999 999 999"
            placeholderTextColor={APP_COLORS.mutedForeground}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={inputStyle}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: APP_COLORS.mutedForeground }}>
            Type de client
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {TYPES.map((option) => {
              const active = type === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setType(option.value)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    borderRadius: APP_RADIUS.md,
                    paddingVertical: 12,
                    backgroundColor: active ? APP_COLORS.primary : APP_COLORS.muted,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Inter_500Medium',
                      fontSize: 14,
                      color: active ? APP_COLORS.primaryForeground : APP_COLORS.mutedForeground,
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSaving || !canSubmit}
          style={{
            alignItems: 'center',
            borderRadius: 14,
            backgroundColor: APP_COLORS.primary,
            paddingVertical: 16,
            opacity: isSaving || !canSubmit ? 0.6 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color={APP_COLORS.primaryForeground} />
          ) : (
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: APP_COLORS.primaryForeground }}>
              Enregistrer
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
