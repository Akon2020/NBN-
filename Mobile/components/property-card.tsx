import { Image } from 'expo-image';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { PROPERTY_TYPE_LABELS, type Property } from '@/lib/properties';

// DESIGN-G02 — carte propriété : rayons de bordure généreux, badge statut,
// favoris, cohérente avec la palette de marque (CLAUDE.md §10).
interface PropertyCardProps {
  property: Property;
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function PropertyCard({ property, onPress, isFavorite, onToggleFavorite }: PropertyCardProps) {
  const imageUrl = property.images?.[0]?.image;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="mb-4 overflow-hidden rounded-3xl bg-white dark:bg-neutral-800"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
    >
      <View className="relative h-44 w-full bg-neutral-200 dark:bg-neutral-700">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <MaterialIcons name="home" size={40} color="#9AA1AC" />
          </View>
        )}

        <View className="absolute left-3 top-3 rounded-full bg-primary-900/90 px-3 py-1.5">
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#fff' }}>
            {property.category === 'RENT' ? 'À louer' : 'À vendre'}
          </Text>
        </View>

        {onToggleFavorite && (
          <TouchableOpacity
            onPress={onToggleFavorite}
            className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-white/90"
          >
            <MaterialIcons
              name={isFavorite ? 'favorite' : 'favorite-border'}
              size={20}
              color={isFavorite ? '#D92D20' : '#16181D'}
            />
          </TouchableOpacity>
        )}
      </View>

      <View className="gap-1 p-4">
        <Text
          numberOfLines={1}
          style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 16 }}
          className="text-neutral-900 dark:text-white"
        >
          {property.avenue || PROPERTY_TYPE_LABELS[property.propertyType]}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontFamily: 'Inter_400Regular', fontSize: 13 }}
          className="text-neutral-600 dark:text-neutral-300"
        >
          {property.quartier ? `${property.quartier} · ` : ''}
          {PROPERTY_TYPE_LABELS[property.propertyType]}
        </Text>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 18, color: '#C13F0B' }} className="mt-1">
          ${property.price}
          {property.category === 'RENT' ? '/mois' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
