import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  PROPERTY_TYPE_LABELS,
  RENTAL_UNIT_LABELS,
  getPublicProperty,
  getSingleProperty,
  type Property,
} from '@/lib/properties';
import { addFavorite, getMyFavorites, removeFavorite } from '@/lib/favorites';
import { getLocalFavoriteIds, toggleLocalFavorite } from '@/lib/localFavorites';
import { getAccessToken } from '@/lib/secureStore';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

const WHATSAPP_GREEN = '#25D366'; // Couleur de marque WhatsApp — exception délibérée, pas une couleur de thème.

// DESIGN-G02 — fiche bien partagée entre le profil "client final" (lecture
// publique, favoris locaux) et "interne" (lecture authentifiée, favoris
// serveur) : un seul écran, la source de données change selon la session.
// Thème clair aligné sur Frontend/styles/globals.css.
export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const idProperty = Number(id);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      const authenticated = Boolean(token);
      setIsAuthenticated(authenticated);

      if (authenticated) {
        const [propertyData, favorites] = await Promise.all([
          getSingleProperty(idProperty),
          getMyFavorites().catch(() => []),
        ]);
        setProperty(propertyData);
        setIsFavorite(favorites.some((f) => f.idProperty === idProperty));
      } else {
        const [propertyData, localIds] = await Promise.all([
          getPublicProperty(idProperty),
          getLocalFavoriteIds(),
        ]);
        setProperty(propertyData);
        setIsFavorite(localIds.has(idProperty));
      }
    } catch {
      setProperty(null);
    } finally {
      setIsLoading(false);
    }
  }, [idProperty]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFavorite = async () => {
    if (isAuthenticated) {
      try {
        if (isFavorite) {
          await removeFavorite(idProperty);
        } else {
          await addFavorite(idProperty);
        }
        setIsFavorite(!isFavorite);
      } catch {
        // Silencieux : l'utilisateur peut réessayer, pas d'état critique.
      }
    } else {
      const updated = await toggleLocalFavorite(idProperty);
      setIsFavorite(updated.has(idProperty));
    }
  };

  const callPhone = () => {
    const phone = property?.phones?.[0]?.phoneNumber;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const openWhatsApp = () => {
    const phone = property?.phones?.[0]?.phoneNumber;
    if (!property || !phone) return;
    const message = `Bonjour, je suis intéressé(e) par ce bien : ${PROPERTY_TYPE_LABELS[property.propertyType]} à ${property.quartier || 'Bukavu'} — $${property.price}${property.category === 'RENT' ? '/mois' : ''}.`;
    Linking.openURL(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: APP_COLORS.background }}>
        <ActivityIndicator color={APP_COLORS.primary} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: APP_COLORS.background, paddingHorizontal: 24 }}>
        <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 18, color: APP_COLORS.foreground }}>
          Bien introuvable
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ borderRadius: APP_RADIUS.md, backgroundColor: APP_COLORS.primary, paddingHorizontal: 20, paddingVertical: 12 }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', color: APP_COLORS.primaryForeground }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl = property.images?.[0]?.image;
  const phone = property.phones?.[0]?.phoneNumber;
  const amenities = [
    property.bedrooms != null && { icon: 'bed' as const, value: property.bedrooms, label: 'Chambres' },
    property.livingRooms != null && { icon: 'weekend' as const, value: property.livingRooms, label: 'Salons' },
    property.toilets != null && { icon: 'bathtub' as const, value: property.toilets, label: 'Douches' },
  ].filter(Boolean) as { icon: keyof typeof MaterialIcons.glyphMap; value: number; label: string }[];

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        <View
          style={{
            position: 'relative',
            height: 300,
            width: '100%',
            backgroundColor: APP_COLORS.muted,
            borderBottomLeftRadius: APP_RADIUS.xl,
            borderBottomRightRadius: APP_RADIUS.xl,
            overflow: 'hidden',
          }}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="home" size={56} color={APP_COLORS.mutedForeground} />
            </View>
          )}

          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              position: 'absolute',
              height: 40,
              width: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.92)',
              top: insets.top + 8,
              left: 16,
            }}
          >
            <MaterialIcons name="arrow-back" size={22} color={APP_COLORS.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleFavorite}
            style={{
              position: 'absolute',
              height: 40,
              width: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.92)',
              top: insets.top + 8,
              right: 16,
            }}
          >
            <MaterialIcons
              name={isFavorite ? 'favorite' : 'favorite-border'}
              size={22}
              color={isFavorite ? APP_COLORS.destructive : APP_COLORS.foreground}
            />
          </TouchableOpacity>
        </View>

        <View style={{ gap: 18, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 22, color: APP_COLORS.foreground }}>
                {property.avenue || PROPERTY_TYPE_LABELS[property.propertyType]}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <MaterialIcons name="place" size={16} color={APP_COLORS.mutedForeground} />
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: APP_COLORS.mutedForeground }}>
                  {property.quartier ? `${property.quartier}, ` : ''}Bukavu
                </Text>
              </View>
            </View>
            <View style={{ borderRadius: 999, backgroundColor: APP_COLORS.muted, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: APP_COLORS.foreground }}>
                {PROPERTY_TYPE_LABELS[property.propertyType]}
              </Text>
            </View>
          </View>

          <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 28, color: APP_COLORS.foreground }}>
            ${property.price.toLocaleString()}
            {property.category === 'RENT' ? (
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: APP_COLORS.mutedForeground }}> /mois</Text>
            ) : null}
          </Text>

          {amenities.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {amenities.map((amenity) => (
                <View
                  key={amenity.label}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    gap: 4,
                    borderRadius: APP_RADIUS.md,
                    backgroundColor: APP_COLORS.muted,
                    paddingVertical: 14,
                  }}
                >
                  <MaterialIcons name={amenity.icon} size={20} color={APP_COLORS.foreground} />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: APP_COLORS.foreground }}>
                    {amenity.value}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: APP_COLORS.mutedForeground }}>
                    {amenity.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {property.rentalDetails && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderRadius: APP_RADIUS.md,
                backgroundColor: APP_COLORS.muted,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <MaterialIcons name="account-balance-wallet" size={18} color={APP_COLORS.foreground} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: APP_COLORS.foreground }}>
                Garantie : {property.rentalDetails.guarantee ?? 0} {RENTAL_UNIT_LABELS[property.rentalDetails.unit]}
              </Text>
            </View>
          )}

          {property.description && (
            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: APP_COLORS.foreground }}>
                Description
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, color: APP_COLORS.mutedForeground }}>
                {property.description}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {phone && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            flexDirection: 'row',
            gap: 12,
            borderTopWidth: 1,
            borderTopColor: APP_COLORS.border,
            backgroundColor: 'rgba(255,255,255,0.97)',
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: insets.bottom + 14,
          }}
        >
          <TouchableOpacity
            onPress={callPhone}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: APP_RADIUS.md,
              borderWidth: 1.5,
              borderColor: APP_COLORS.primary,
              paddingVertical: 14,
            }}
          >
            <MaterialIcons name="call" size={18} color={APP_COLORS.foreground} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: APP_COLORS.foreground }}>Appeler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openWhatsApp}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: APP_RADIUS.md,
              backgroundColor: WHATSAPP_GREEN,
              paddingVertical: 14,
            }}
          >
            <MaterialIcons name="chat" size={18} color="#fff" />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#fff' }}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
