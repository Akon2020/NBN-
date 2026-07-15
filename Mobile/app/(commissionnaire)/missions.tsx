import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDraftMissions } from '@/lib/repository/missionRepository';
import { useSyncOnReconnect } from '@/lib/sync/useSyncOnReconnect';
import { DRAFT_STATUS_LABELS, MISSION_TYPE_LABELS, type DraftMission, type DraftStatus } from '@/lib/missions';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

const STATUS_COLORS: Record<DraftStatus, { bg: string; text: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  PENDING: { bg: '#D9770619', text: APP_COLORS.warning, icon: 'schedule' },
  SYNCING: { bg: '#1A1A1A14', text: APP_COLORS.foreground, icon: 'sync' },
  SYNCED: { bg: '#16A34A19', text: APP_COLORS.success, icon: 'check-circle' },
  FAILED: { bg: '#DC262619', text: APP_COLORS.destructive, icon: 'error' },
};

function DraftCard({ draft }: { draft: DraftMission }) {
  const colors = STATUS_COLORS[draft.status];
  const summary =
    draft.type === 'SUIVI'
      ? (draft.payload as { notes?: string }).notes || 'Suivi client'
      : draft.type === 'APPORT_CLIENT'
        ? (draft.payload as { fullName?: string }).fullName || 'Nouveau client'
        : (draft.payload as { avenue?: string; quartier?: string }).avenue ||
          (draft.payload as { quartier?: string }).quartier ||
          'Nouveau bien';

  return (
    <View
      style={{
        marginBottom: 12,
        borderRadius: APP_RADIUS.lg,
        backgroundColor: APP_COLORS.card,
        borderWidth: 1,
        borderColor: APP_COLORS.border,
        padding: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: APP_COLORS.mutedForeground }}>
          {MISSION_TYPE_LABELS[draft.type]}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: colors.bg,
          }}
        >
          <MaterialIcons name={colors.icon} size={13} color={colors.text} />
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.text }}>
            {DRAFT_STATUS_LABELS[draft.status]}
          </Text>
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: APP_COLORS.foreground, marginTop: 6 }}
      >
        {summary}
      </Text>
      {draft.errorMessage && (
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: APP_COLORS.destructive, marginTop: 4 }}>
          {draft.errorMessage}
        </Text>
      )}
    </View>
  );
}

export default function MissionsScreen() {
  const insets = useSafeAreaInsets();
  const [drafts, setDrafts] = useState<DraftMission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { pendingCount, isSyncing, runSync } = useSyncOnReconnect();

  const load = useCallback(async () => {
    setDrafts(await getDraftMissions());
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSync = async () => {
    await runSync();
    await load();
  };

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background }}>
      <View style={{ gap: 12, paddingHorizontal: 20, paddingBottom: 12, paddingTop: insets.top + 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 22, color: APP_COLORS.foreground }}>
              Mes missions
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: APP_COLORS.mutedForeground, marginTop: 2 }}>
              {pendingCount > 0
                ? `${pendingCount} en attente de synchronisation`
                : 'Tout est synchronisé'}
            </Text>
          </View>
          {pendingCount > 0 && (
            <TouchableOpacity
              onPress={handleSync}
              disabled={isSyncing}
              style={{
                height: 44,
                width: 44,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                backgroundColor: APP_COLORS.primary,
                opacity: isSyncing ? 0.6 : 1,
              }}
            >
              <MaterialIcons name="sync" size={20} color={APP_COLORS.primaryForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={drafts}
        keyExtractor={(item) => item.uuid}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
        renderItem={({ item }) => <DraftCard draft={item} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 64 }}>
              <MaterialIcons name="assignment" size={40} color={APP_COLORS.mutedForeground} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: APP_COLORS.mutedForeground }}>
                Aucune mission pour le moment
              </Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        onPress={() => router.push('/collecte/nouveau' as never)}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          height: 56,
          width: 56,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          backgroundColor: APP_COLORS.primary,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 5,
        }}
      >
        <MaterialIcons name="add" size={28} color={APP_COLORS.primaryForeground} />
      </TouchableOpacity>
    </View>
  );
}
