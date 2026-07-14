import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PropertyCard } from '@/components/property-card';
import { getPublicProperties, type Property } from '@/lib/properties';
import { getLocalFavoriteIds, toggleLocalFavorite } from '@/lib/localFavorites';

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
    <View className="flex-1 bg-neutral-100 dark:bg-neutral-900" style={{ paddingTop: insets.top }}>
      <View className="bg-white px-5 pb-4 pt-4 dark:bg-neutral-900">
        <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 20 }} className="text-neutral-900 dark:text-white">
          Mes favoris
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13 }} className="mt-1 text-neutral-600 dark:text-neutral-300">
          Enregistrés sur cet appareil
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#C13F0B" />
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
            <View className="items-center gap-2 py-16">
              <MaterialIcons name="favorite-border" size={40} color="#9AA1AC" />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }} className="text-neutral-600 dark:text-neutral-300">
                Aucun favori pour le moment
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
