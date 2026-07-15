import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PropertyCard } from '@/components/property-card';
import { getAllProperties, type Property, type PropertyCategory } from '@/lib/properties';
import { addFavorite, getMyFavorites, removeFavorite } from '@/lib/favorites';
import { APP_COLORS } from '@/constants/theme-app';

type CategoryFilter = 'all' | PropertyCategory;

const FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'RENT', label: 'À louer' },
  { key: 'SALE', label: 'À vendre' },
];

// MOBILE-G03 — consultation "interne limité" : compte réel, lecture
// authentifiée du catalogue complet, favoris synchronisés côté serveur.
export default function BiensInterneScreen() {
  const insets = useSafeAreaInsets();
  const [properties, setProperties] = useState<Property[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  useEffect(() => {
    const load = async () => {
      try {
        const [propertiesData, favorites] = await Promise.all([
          getAllProperties(),
          getMyFavorites().catch(() => []),
        ]);
        setProperties(propertiesData);
        setFavoriteIds(new Set(favorites.map((f) => f.idProperty)));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const toggleFavorite = useCallback(
    async (idProperty: number) => {
      try {
        if (favoriteIds.has(idProperty)) {
          await removeFavorite(idProperty);
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(idProperty);
            return next;
          });
        } else {
          await addFavorite(idProperty);
          setFavoriteIds((prev) => new Set(prev).add(idProperty));
        }
      } catch {
        // Silencieux : l'utilisateur peut réessayer.
      }
    },
    [favoriteIds]
  );

  const filtered = useMemo(() => {
    return properties.filter((property) => {
      if (category !== 'all' && property.category !== category) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matches =
          (property.quartier || '').toLowerCase().includes(search) ||
          (property.avenue || '').toLowerCase().includes(search);
        if (!matches) return false;
      }
      return true;
    });
  }, [properties, category, searchTerm]);

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background }}>
      <View style={{ gap: 16, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderRadius: 999,
            backgroundColor: APP_COLORS.muted,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <MaterialIcons name="search" size={20} color={APP_COLORS.mutedForeground} />
          <TextInput
            placeholder="Quartier, avenue..."
            placeholderTextColor={APP_COLORS.mutedForeground}
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={{ flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: APP_COLORS.foreground }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {FILTERS.map((option) => {
            const active = category === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                onPress={() => setCategory(option.key)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  backgroundColor: active ? APP_COLORS.primary : APP_COLORS.muted,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: 13,
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

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={APP_COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.idProperty)}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={() => router.push(`/property/${item.idProperty}` as never)}
              isFavorite={favoriteIds.has(item.idProperty)}
              onToggleFavorite={() => toggleFavorite(item.idProperty)}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 64 }}>
              <MaterialIcons name="search-off" size={40} color={APP_COLORS.mutedForeground} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: APP_COLORS.mutedForeground }}>
                Aucun bien trouvé
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
