import { Image } from 'expo-image';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { PROPERTY_TYPE_LABELS, type Property } from '@/lib/properties';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

// DESIGN-G02 — carte propriété, thème clair aligné sur la palette de
// marque réelle du Frontend (Frontend/app/globals.css) : fond blanc,
// rayons généreux, ombre douce, badge catégorie coloré (vert location /
// orange vente), prix en accent fort, favoris en overlay circulaire —
// inspiré des patterns de listing immobilier (image + pills + prix
// visible immédiatement).
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
      style={{
        marginBottom: 16,
        borderRadius: APP_RADIUS.xl,
        backgroundColor: APP_COLORS.card,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
        borderWidth: 1,
        borderColor: APP_COLORS.border,
      }}
    >
      <View style={{ position: 'relative', height: 176, width: '100%', backgroundColor: APP_COLORS.muted }}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="home" size={36} color={APP_COLORS.mutedForeground} />
          </View>
        )}

        <View
          style={{
            position: 'absolute',
            left: 12,
            top: 12,
            borderRadius: 999,
            backgroundColor: property.category === 'RENT' ? APP_COLORS.secondary : APP_COLORS.primary,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#fff' }}>
            {property.category === 'RENT' ? 'À louer' : 'À vendre'}
          </Text>
        </View>

        {onToggleFavorite && (
          <TouchableOpacity
            onPress={onToggleFavorite}
            style={{
              position: 'absolute',
              right: 12,
              top: 12,
              height: 34,
              width: 34,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.92)',
            }}
          >
            <MaterialIcons
              name={isFavorite ? 'favorite' : 'favorite-border'}
              size={18}
              color={isFavorite ? APP_COLORS.destructive : APP_COLORS.foreground}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ padding: 16, gap: 4 }}>
        <Text
          numberOfLines={1}
          style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 16, color: APP_COLORS.foreground }}
        >
          {property.avenue || PROPERTY_TYPE_LABELS[property.propertyType]}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialIcons name="place" size={13} color={APP_COLORS.mutedForeground} />
          <Text
            numberOfLines={1}
            style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: APP_COLORS.mutedForeground }}
          >
            {property.quartier ? `${property.quartier} · ` : ''}
            {PROPERTY_TYPE_LABELS[property.propertyType]}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
          <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 19, color: APP_COLORS.foreground }}>
            ${property.price.toLocaleString()}
          </Text>
          {property.category === 'RENT' && (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: APP_COLORS.mutedForeground }}>
              /mois
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
