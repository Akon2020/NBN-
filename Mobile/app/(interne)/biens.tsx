import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PropertyCard } from '@/components/property-card';
import {
  getAllProperties,
  PROPERTY_TYPE_LABELS,
  type Property,
  type PropertyCategory,
  type PropertyType,
} from '@/lib/properties';
import { addFavorite, getMyFavorites, removeFavorite } from '@/lib/favorites';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';
import {
  countActiveFilters,
  EMPTY_FILTERS,
  PropertyFilterModal,
  type PropertyFilters,
} from '@/components/property-filter-modal';

type CategoryFilter = 'all' | PropertyCategory;
type TypeFilter = 'all' | PropertyType;

const FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'RENT', label: 'À louer' },
  { key: 'SALE', label: 'À vendre' },
];

const TYPE_FILTERS: { key: TypeFilter; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'all', label: 'Tous types', icon: 'apps' },
  { key: 'APPARTEMENT', label: PROPERTY_TYPE_LABELS.APPARTEMENT, icon: 'apartment' },
  { key: 'MAISON', label: PROPERTY_TYPE_LABELS.MAISON, icon: 'home' },
  { key: 'CONSTRUCTION_DURABLE', label: 'Construction', icon: 'foundation' },
  { key: 'TERRAIN_PLAT', label: 'Terrain', icon: 'terrain' },
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
  const [propertyType, setPropertyType] = useState<TypeFilter>('all');
  const [filters, setFilters] = useState<PropertyFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

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
    const minPrice = filters.minPrice ? Number(filters.minPrice) : null;
    const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : null;

    return properties.filter((property) => {
      if (category !== 'all' && property.category !== category) return false;
      if (propertyType !== 'all' && property.propertyType !== propertyType) return false;
      if (filters.minBedrooms !== null && (property.bedrooms ?? 0) < filters.minBedrooms) return false;
      if (filters.minToilets !== null && (property.toilets ?? 0) < filters.minToilets) return false;
      if (minPrice !== null && property.price < minPrice) return false;
      if (maxPrice !== null && property.price > maxPrice) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matches =
          (property.quartier || '').toLowerCase().includes(search) ||
          (property.avenue || '').toLowerCase().includes(search);
        if (!matches) return false;
      }
      return true;
    });
  }, [properties, category, propertyType, filters, searchTerm]);

  const activeFilterCount = countActiveFilters(filters);

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background }}>
      <View style={{ gap: 16, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <View
            style={{
              flex: 1,
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
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={{
              height: 46,
              width: 46,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              backgroundColor: activeFilterCount > 0 ? APP_COLORS.primary : APP_COLORS.muted,
            }}
          >
            <MaterialIcons
              name="tune"
              size={20}
              color={activeFilterCount > 0 ? APP_COLORS.primaryForeground : APP_COLORS.foreground}
            />
            {activeFilterCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  height: 16,
                  width: 16,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: APP_COLORS.destructive,
                  borderWidth: 1.5,
                  borderColor: APP_COLORS.background,
                }}
              >
                <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {TYPE_FILTERS.map((option) => {
            const active = propertyType === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                onPress={() => setPropertyType(option.key)}
                className="flex-row items-center"
                style={{
                  gap: 6,
                  borderRadius: APP_RADIUS.md,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderWidth: 1,
                  borderColor: active ? APP_COLORS.foreground : APP_COLORS.border,
                  backgroundColor: active ? APP_COLORS.foreground : APP_COLORS.background,
                }}
              >
                <MaterialIcons
                  name={option.icon}
                  size={15}
                  color={active ? APP_COLORS.background : APP_COLORS.mutedForeground}
                />
                <Text
                  style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: 12.5,
                    color: active ? APP_COLORS.background : APP_COLORS.mutedForeground,
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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

      <PropertyFilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={setFilters}
        resultCount={filtered.length}
      />
    </View>
  );
}
