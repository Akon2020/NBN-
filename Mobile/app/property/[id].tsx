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

// DESIGN-G02 — fiche bien partagée entre le profil "client final" (lecture
// publique, favoris locaux) et "interne" (lecture authentifiée, favoris
// serveur) : un seul écran, la source de données change selon la session.
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
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator color="#C13F0B" />
      </View>
    );
  }

  if (!property) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white px-6 dark:bg-neutral-900">
        <Text
          style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 18 }}
          className="text-neutral-900 dark:text-white"
        >
          Bien introuvable
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="rounded-xl bg-primary-900 px-5 py-3">
          <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl = property.images?.[0]?.image;
  const phone = property.phones?.[0]?.phoneNumber;

  return (
    <View className="flex-1 bg-white dark:bg-neutral-900">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="relative h-72 w-full bg-neutral-200 dark:bg-neutral-700">
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <View className="flex-1 items-center justify-center">
              <MaterialIcons name="home" size={56} color="#9AA1AC" />
            </View>
          )}

          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute h-10 w-10 items-center justify-center rounded-full bg-white/90"
            style={{ top: insets.top + 8, left: 16 }}
          >
            <MaterialIcons name="arrow-back" size={22} color="#16181D" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleFavorite}
            className="absolute h-10 w-10 items-center justify-center rounded-full bg-white/90"
            style={{ top: insets.top + 8, right: 16 }}
          >
            <MaterialIcons
              name={isFavorite ? 'favorite' : 'favorite-border'}
              size={22}
              color={isFavorite ? '#D92D20' : '#16181D'}
            />
          </TouchableOpacity>
        </View>

        <View className="gap-4 p-5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text
                style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 22 }}
                className="text-neutral-900 dark:text-white"
              >
                {property.avenue || PROPERTY_TYPE_LABELS[property.propertyType]}
              </Text>
              <View className="mt-1 flex-row items-center gap-1">
                <MaterialIcons name="place" size={16} color="#5B6472" />
                <Text
                  style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}
                  className="text-neutral-600 dark:text-neutral-300"
                >
                  {property.quartier ? `${property.quartier}, ` : ''}Bukavu
                </Text>
              </View>
            </View>
            <View className="rounded-full bg-secondary-600/10 px-3 py-1.5">
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#245640' }}>
                {PROPERTY_TYPE_LABELS[property.propertyType]}
              </Text>
            </View>
          </View>

          <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 26, color: '#C13F0B' }}>
            ${property.price}
            {property.category === 'RENT' ? (
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }} className="text-neutral-600">
                {' '}
                /mois
              </Text>
            ) : null}
          </Text>

          {!!(property.bedrooms || property.livingRooms || property.toilets) && (
            <View className="flex-row gap-3">
              {property.bedrooms != null && (
                <View className="flex-1 items-center gap-1 rounded-2xl bg-neutral-100 py-3 dark:bg-neutral-800">
                  <MaterialIcons name="bed" size={20} color="#14294A" />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14 }} className="text-neutral-900 dark:text-white">
                    {property.bedrooms}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11 }} className="text-neutral-600 dark:text-neutral-300">
                    Chambres
                  </Text>
                </View>
              )}
              {property.livingRooms != null && (
                <View className="flex-1 items-center gap-1 rounded-2xl bg-neutral-100 py-3 dark:bg-neutral-800">
                  <MaterialIcons name="weekend" size={20} color="#14294A" />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14 }} className="text-neutral-900 dark:text-white">
                    {property.livingRooms}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11 }} className="text-neutral-600 dark:text-neutral-300">
                    Salons
                  </Text>
                </View>
              )}
              {property.toilets != null && (
                <View className="flex-1 items-center gap-1 rounded-2xl bg-neutral-100 py-3 dark:bg-neutral-800">
                  <MaterialIcons name="bathtub" size={20} color="#14294A" />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14 }} className="text-neutral-900 dark:text-white">
                    {property.toilets}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11 }} className="text-neutral-600 dark:text-neutral-300">
                    Douches
                  </Text>
                </View>
              )}
            </View>
          )}

          {property.rentalDetails && (
            <View className="flex-row items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
              <MaterialIcons name="account-balance-wallet" size={18} color="#245640" />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13 }} className="text-neutral-700 dark:text-neutral-200">
                Garantie : {property.rentalDetails.guarantee ?? 0}{' '}
                {RENTAL_UNIT_LABELS[property.rentalDetails.unit]}
              </Text>
            </View>
          )}

          {property.description && (
            <View className="gap-1">
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 15 }} className="text-neutral-900 dark:text-white">
                Description
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 }} className="text-neutral-600 dark:text-neutral-300">
                {property.description}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {phone && (
        <View
          className="absolute bottom-0 left-0 right-0 flex-row gap-3 border-t border-neutral-200 bg-white/95 px-5 pt-3 dark:border-neutral-800 dark:bg-neutral-900/95"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <TouchableOpacity
            onPress={callPhone}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-primary-900 py-3.5"
          >
            <MaterialIcons name="call" size={18} color="#14294A" />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#14294A' }}>Appeler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openWhatsApp}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-secondary-600 py-3.5"
          >
            <MaterialIcons name="chat" size={18} color="#fff" />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#fff' }}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
