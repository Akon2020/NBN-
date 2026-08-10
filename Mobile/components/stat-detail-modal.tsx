import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

// GOAL 21 (post-mission) — "cliquer sur un élément du dashboard doit
// montrer les données exactes qui y sont liées, avec leurs détails" :
// une seule feuille générique réutilisée pour chaque type de statistique
// (biens, clients, missions, réquisitions, caisses, commissions,
// utilisateurs) plutôt que sept écrans quasi identiques. Chaque appelant
// fournit sa propre fonction de chargement (le vrai endpoint Backend
// correspondant) et son propre rendu de ligne.
interface StatDetailModalProps<T> {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  load: () => Promise<T[]>;
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  emptyLabel?: string;
}

export function StatDetailModal<T>({
  visible,
  onClose,
  title,
  icon,
  color,
  load,
  keyExtractor,
  renderItem,
  emptyLabel = 'Aucun élément',
}: StatDetailModalProps<T>) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setIsLoading(true);
    setError(false);
    load()
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, [visible, load]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,23,22,0.4)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: APP_COLORS.background,
            borderTopLeftRadius: APP_RADIUS.xl,
            borderTopRightRadius: APP_RADIUS.xl,
            maxHeight: '82%',
            minHeight: '40%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: APP_COLORS.border,
            }}
          >
            <View
              style={{
                height: 36,
                width: 36,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${color}19`,
              }}
            >
              <MaterialIcons name={icon} size={18} color={color} />
            </View>
            <Text
              style={{ flex: 1, fontFamily: 'Manrope_700Bold', fontSize: 18, color: APP_COLORS.foreground }}
            >
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={APP_COLORS.mutedForeground} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={{ paddingVertical: 48, alignItems: 'center' }}>
              <ActivityIndicator color={APP_COLORS.primary} />
            </View>
          ) : error ? (
            <View style={{ paddingVertical: 48, alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="error-outline" size={32} color={APP_COLORS.mutedForeground} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: APP_COLORS.mutedForeground }}>
                Impossible de charger ces données
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={keyExtractor}
              contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
              renderItem={({ item }) => <>{renderItem(item)}</>}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', gap: 8, paddingVertical: 48 }}>
                  <MaterialIcons name="inbox" size={32} color={APP_COLORS.mutedForeground} />
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: APP_COLORS.mutedForeground }}>
                    {emptyLabel}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// Ligne générique réutilisable pour la plupart des types de données du
// dashboard (titre + sous-titre + badge de statut optionnel).
export function DetailRow({
  title,
  subtitle,
  badge,
  badgeColor,
  onPress,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{
        marginBottom: 10,
        borderRadius: APP_RADIUS.md,
        borderWidth: 1,
        borderColor: APP_COLORS.border,
        backgroundColor: APP_COLORS.card,
        padding: 14,
        gap: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 14, color: APP_COLORS.foreground }}
        >
          {title}
        </Text>
        {badge && (
          <View
            style={{
              borderRadius: 999,
              paddingHorizontal: 9,
              paddingVertical: 3,
              backgroundColor: `${badgeColor || APP_COLORS.mutedForeground}19`,
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 11,
                color: badgeColor || APP_COLORS.mutedForeground,
              }}
            >
              {badge}
            </Text>
          </View>
        )}
      </View>
      {subtitle && (
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12.5, color: APP_COLORS.mutedForeground }}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
}
