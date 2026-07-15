import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PropertyCard } from '@/components/property-card';
import { getPublicProperties, type Property } from '@/lib/properties';
import { getLocalFavoriteIds, toggleLocalFavorite } from '@/lib/localFavorites';
import { APP_COLORS } from '@/constants/theme-app';

// MOBILE-G03 — favoris "client final" : classification offline-readable
// (CLAUDE.md §8) via stockage local (aucun compte serveur pour ce profil).
export default function FavorisScreen() {
  const insets = useSafeAreaInsets();
  const [favoriteProperties, setFavoriteProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allProperties, favoriteIds] = await Promise.all([
        getPublicProperties(),
        getLocalFavoriteIds(),
      ]);
      setFavoriteProperties(allProperties.filter((p) => favoriteIds.has(p.idProperty)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Rechargé à chaque retour sur l'onglet — un favori ajouté depuis la
  // fiche détail doit apparaître immédiatement ici.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const removeFavorite = async (idProperty: number) => {
    await toggleLocalFavorite(idProperty);
    setFavoriteProperties((prev) => prev.filter((p) => p.idProperty !== idProperty));
  };

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: 16 }}>
        <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 24, color: APP_COLORS.foreground }}>
          Mes favoris
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: APP_COLORS.mutedForeground, marginTop: 2 }}>
          Enregistrés sur cet appareil
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={APP_COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={favoriteProperties}
          keyExtractor={(item) => String(item.idProperty)}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={() => router.push(`/property/${item.idProperty}` as never)}
              isFavorite
              onToggleFavorite={() => removeFavorite(item.idProperty)}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 64 }}>
              <MaterialIcons name="favorite-border" size={40} color={APP_COLORS.mutedForeground} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: APP_COLORS.mutedForeground }}>
                Aucun favori pour le moment
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
