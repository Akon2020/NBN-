import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createDraftMission } from '@/lib/repository/missionRepository';
import { syncPendingMissions } from '@/lib/sync/syncEngine';
import { APP_COLORS } from '@/constants/theme-app';

export default function SuiviCollecteScreen() {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!notes.trim()) return;
    setIsSaving(true);
    try {
      await createDraftMission('SUIVI', { notes: notes.trim() });
      // Tentative de synchronisation immédiate si une connexion est déjà
      // là — sinon le draft reste en attente, repris automatiquement au
      // retour réseau (useSyncOnReconnect).
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
          style={{ height: 36, width: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: APP_COLORS.secondary }}
        >
          <MaterialIcons name="arrow-back" size={20} color={APP_COLORS.foreground} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 20, color: APP_COLORS.foreground }}>
          Note de suivi
        </Text>
      </View>

      <View style={{ gap: 8, paddingHorizontal: 20, paddingTop: 8 }}>
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: APP_COLORS.mutedForeground }}>
          Détails du suivi
        </Text>
        <TextInput
          placeholder="Ex : Visite effectuée avec le client, en attente de sa décision..."
          placeholderTextColor={APP_COLORS.mutedForeground}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 15,
            minHeight: 140,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: APP_COLORS.border,
            paddingHorizontal: 16,
            paddingVertical: 12,
            color: APP_COLORS.foreground,
          }}
        />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSaving || !notes.trim()}
          style={{
            alignItems: 'center',
            borderRadius: 14,
            backgroundColor: APP_COLORS.primary,
            paddingVertical: 16,
            opacity: isSaving || !notes.trim() ? 0.6 : 1,
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
