import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { APP_COLORS } from '@/constants/theme-app';

interface NotificationItem {
  idNotification: number;
  type: string;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

// MOBILE-G05 — partagé entre (interne) et (commissionnaire) : même liste,
// même comportement, seul le point d'entrée (onglet) diffère par
// arborescence. Socket.IO ne fait que déclencher un refetch (CLAUDE.md
// §6) ; sans connexion active, la liste reste correcte au prochain focus
// d'écran (fallback REST, jamais de dépendance dure au temps réel).
// `showHeader` : (interne) a déjà un header natif via le titre d'onglet,
// (commissionnaire) désactive le header natif (ses écrans construisent le
// leur) — cet écran doit donc fournir le sien dans ce second cas.
export function NotificationsList({ showHeader = false }: { showHeader?: boolean }) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications/me');
      setNotifications(res.data.data);
    } catch {
      // Silencieux — l'écran reste utilisable avec la dernière liste connue.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    const socket = getSocket();
    const handleNew = () => load();
    socket.on('notification:new', handleNew);
    return () => {
      socket.off('notification:new', handleNew);
    };
  }, [load]);

  const markRead = async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.idNotification === id ? { ...n, isRead: true } : n))
    );
    try {
      await api.patch(`/api/notifications/${id}/lue`);
    } catch {
      load();
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: APP_COLORS.background }}>
        <ActivityIndicator color={APP_COLORS.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: APP_COLORS.background }}
      data={notifications}
      keyExtractor={(item) => String(item.idNotification)}
      contentContainerStyle={{
        padding: 20,
        paddingTop: showHeader ? insets.top + 16 : 20,
        paddingBottom: insets.bottom + 20,
      }}
      ListHeaderComponent={
        showHeader ? (
          <Text
            style={{
              fontFamily: 'Manrope_700Bold',
              fontSize: 24,
              color: APP_COLORS.foreground,
              marginBottom: 16,
            }}
          >
            Notifications
          </Text>
        ) : null
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => !item.isRead && markRead(item.idNotification)}
          style={{
            marginBottom: 10,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: APP_COLORS.border,
            backgroundColor: item.isRead ? APP_COLORS.background : `${APP_COLORS.primary}0D`,
            padding: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: APP_COLORS.foreground }}>
                {item.title}
              </Text>
              {item.message && (
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: APP_COLORS.mutedForeground, marginTop: 2 }}>
                  {item.message}
                </Text>
              )}
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: APP_COLORS.mutedForeground, marginTop: 4 }}>
                {new Date(item.createdAt).toLocaleString('fr-FR')}
              </Text>
            </View>
            {!item.isRead && (
              <View style={{ height: 8, width: 8, borderRadius: 999, backgroundColor: APP_COLORS.primary, marginTop: 4 }} />
            )}
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 64 }}>
          <MaterialIcons name="notifications-none" size={40} color={APP_COLORS.mutedForeground} />
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: APP_COLORS.mutedForeground }}>
            Aucune notification
          </Text>
        </View>
      }
    />
  );
}
