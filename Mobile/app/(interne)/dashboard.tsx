import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDashboardStats, type DashboardStats, type RecentActivityEntry } from '@/lib/dashboard';
import { logout } from '@/lib/auth';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

// GOAL 21 — tableau de bord réel pour l'arborescence "Interne" (staff/
// admin), jusqu'ici un `RoleScreenPlaceholder`. Même endpoint que le
// Frontend Admin (GET /api/dashboard/stats) — chaque carte n'apparaît que
// si le champ correspondant est présent dans la réponse (permission de
// lecture du domaine, jamais reconstruit côté client).
const ACTIVITY_ICON: Record<RecentActivityEntry['type'], keyof typeof MaterialIcons.glyphMap> = {
  PROPERTY: 'home',
  CLIENT: 'person',
  MISSION: 'assignment-turned-in',
  REQUISITION: 'description',
};

const timeAgo = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
};

function StatCard({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: number;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      onPress={onPress}
      style={{
        flexBasis: '48%',
        borderRadius: APP_RADIUS.lg,
        backgroundColor: APP_COLORS.card,
        borderWidth: 1,
        borderColor: APP_COLORS.border,
        padding: 16,
        gap: 8,
      }}
    >
      <View
        style={{
          height: 36,
          width: 36,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${APP_COLORS.primary}19`,
        }}
      >
        <MaterialIcons name={icon} size={18} color={APP_COLORS.primary} />
      </View>
      <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 22, color: APP_COLORS.foreground }}>
        {value}
      </Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: APP_COLORS.mutedForeground }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function DashboardInterneScreen() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setStats(await getDashboardStats());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (isLoading && !stats) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: APP_COLORS.background }}>
        <ActivityIndicator color={APP_COLORS.primary} />
      </View>
    );
  }

  const cards: { label: string; value: number; icon: keyof typeof MaterialIcons.glyphMap; onPress?: () => void }[] = [];
  if (stats) {
    cards.push(
      { label: 'Biens à louer', value: stats.properties.rentals, icon: 'home', onPress: () => router.push('/(interne)/biens') },
      { label: 'Biens à vendre', value: stats.properties.sales, icon: 'sell', onPress: () => router.push('/(interne)/biens') }
    );
    if (stats.clients !== undefined) cards.push({ label: 'Clients', value: stats.clients, icon: 'people' });
    if (stats.pendingMissions !== undefined)
      cards.push({ label: 'Missions à valider', value: stats.pendingMissions, icon: 'assignment-turned-in' });
    if (stats.pendingRequisitions !== undefined)
      cards.push({ label: 'Réquisitions à traiter', value: stats.pendingRequisitions, icon: 'description' });
    if (stats.openCaisses !== undefined) cards.push({ label: 'Caisses ouvertes', value: stats.openCaisses, icon: 'account-balance-wallet' });
    if (stats.pendingCommissions !== undefined)
      cards.push({ label: 'Commissions dues', value: stats.pendingCommissions, icon: 'percent' });
    if (stats.activeUsers !== undefined) cards.push({ label: 'Utilisateurs actifs', value: stats.activeUsers, icon: 'group' });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: APP_COLORS.background }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, gap: 20 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 22, color: APP_COLORS.foreground }}>
          Tableau de bord
        </Text>
        <TouchableOpacity onPress={handleLogout} style={{ padding: 8 }}>
          <MaterialIcons name="logout" size={20} color={APP_COLORS.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </View>

      <View>
        <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 16, color: APP_COLORS.foreground, marginBottom: 12 }}>
          Activité récente
        </Text>
        {stats && stats.recentActivity.length > 0 ? (
          <View
            style={{
              borderRadius: APP_RADIUS.lg,
              backgroundColor: APP_COLORS.card,
              borderWidth: 1,
              borderColor: APP_COLORS.border,
            }}
          >
            {stats.recentActivity.map((entry, index) => (
              <View
                key={`${entry.type}-${entry.id}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: APP_COLORS.border,
                }}
              >
                <View
                  style={{
                    height: 32,
                    width: 32,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: APP_COLORS.muted,
                  }}
                >
                  <MaterialIcons name={ACTIVITY_ICON[entry.type]} size={16} color={APP_COLORS.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: APP_COLORS.foreground }}>
                    {entry.label}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: APP_COLORS.mutedForeground }}>
                    {entry.detail ? `${entry.detail} — ` : ''}
                    {timeAgo(entry.date)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: APP_COLORS.mutedForeground }}>
            Aucune activité récente
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
