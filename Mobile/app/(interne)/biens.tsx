import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PropertyCard } from '@/components/property-card';
import { getAllProperties, type Property, type PropertyCategory } from '@/lib/properties';
import { addFavorite, getMyFavorites, removeFavorite } from '@/lib/favorites';

type CategoryFilter = 'all' | PropertyCategory;

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
    <View className="flex-1 bg-neutral-100 dark:bg-neutral-900">
      <View className="gap-3 bg-white px-5 pb-4 pt-4 dark:bg-neutral-900">
        <View className="flex-row items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2.5 dark:border-neutral-700">
          <MaterialIcons name="search" size={20} color="#5B6472" />
          <TextInput
            placeholder="Quartier, avenue..."
            placeholderTextColor="#9AA1AC"
            value={searchTerm}
            onChangeText={setSearchTerm}
            className="flex-1 text-neutral-900 dark:text-white"
            style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}
          />
        </View>

        <View className="flex-row gap-2">
          {(
            [
              { key: 'all', label: 'Tous' },
              { key: 'RENT', label: 'À louer' },
              { key: 'SALE', label: 'À vendre' },
            ] as { key: CategoryFilter; label: string }[]
          ).map((option) => (
            <TouchableOpacity
              key={option.key}
              onPress={() => setCategory(option.key)}
              className="rounded-full px-4 py-2"
              style={{ backgroundColor: category === option.key ? '#14294A' : '#F7F7F7' }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 13,
                  color: category === option.key ? '#fff' : '#5B6472',
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#C13F0B" />
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
            <View className="items-center gap-2 py-16">
              <MaterialIcons name="search-off" size={40} color="#9AA1AC" />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }} className="text-neutral-600 dark:text-neutral-300">
                Aucun bien trouvé
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
