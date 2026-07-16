import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import MapView, { Marker } from 'react-native-maps';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getPublicProperties, PROPERTY_TYPE_LABELS, type Property } from '@/lib/properties';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

// Centre par défaut : Bukavu, Sud-Kivu (RDC) — la zone d'activité de NBN
// Express. Les biens réellement géolocalisés (latitude/longitude saisies
// lors de la collecte terrain, MOBILE-G04) apparaissent en bulles de prix ;
// aucune coordonnée n'est jamais inventée pour un bien qui n'en a pas.
const BUKAVU_REGION = {
  latitude: -2.5083,
  longitude: 28.8608,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const MARKER_DELTA = {
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// Halo "radar" en boucle derrière la bulle de prix — distingue les biens
// géolocalisés du reste de la carte. `tracksViewChanges` doit rester actif
// tant que le halo anime (react-native-maps ne fait qu'une capture statique
// du marqueur sinon) ; acceptable au nombre de biens actuel, à revisiter
// (désactiver l'animation au-delà d'un certain nombre de marqueurs) si le
// catalogue géolocalisé grossit significativement.
function PulsingMarker({ isSelected, priceLabel }: { isSelected: boolean; priceLabel: string }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, [pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 1.2 }],
    opacity: (1 - pulse.value) * 0.55,
  }));

  const haloColor = isSelected ? APP_COLORS.foreground : APP_COLORS.primary;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            height: 40,
            width: 40,
            borderRadius: 999,
            backgroundColor: haloColor,
          },
          haloStyle,
        ]}
      />
      <View
        style={{
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 6,
          backgroundColor: haloColor,
          borderWidth: 2,
          borderColor: '#fff',
        }}
      >
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#fff' }}>
          {priceLabel}
        </Text>
      </View>
    </View>
  );
}

const priceLabel = (price: number) => `$${price >= 1000 ? `${Math.round(price / 1000)}k` : price}`;

export default function CarteScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Property | null>(null);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    getPublicProperties()
      .then(setProperties)
      .finally(() => setIsLoading(false));
  }, []);

  const geolocated = useMemo(
    () =>
      properties.filter(
        (p) => p.latitude != null && p.longitude != null && !Number.isNaN(Number(p.latitude))
      ),
    [properties]
  );

  const goToProperty = (property: Property) => {
    setShowList(false);
    setSelected(property);
    mapRef.current?.animateToRegion(
      {
        latitude: Number(property.latitude),
        longitude: Number(property.longitude),
        ...MARKER_DELTA,
      },
      450
    );
  };

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: APP_COLORS.background }}
      >
        <ActivityIndicator color={APP_COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background }}>
      <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={BUKAVU_REGION}>
        {geolocated.map((property) => (
          <Marker
            key={property.idProperty}
            coordinate={{ latitude: Number(property.latitude), longitude: Number(property.longitude) }}
            onPress={() => setSelected(property)}
            tracksViewChanges
          >
            <PulsingMarker
              isSelected={selected?.idProperty === property.idProperty}
              priceLabel={priceLabel(property.price)}
            />
          </Marker>
        ))}
      </MapView>

      <View style={{ position: 'absolute', top: insets.top + 12, left: 20, right: 20 }}>
        <TouchableOpacity
          onPress={() => geolocated.length > 0 && setShowList(true)}
          disabled={geolocated.length === 0}
          className="flex-row items-center justify-between"
          style={{
            gap: 8,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.96)',
            paddingHorizontal: 16,
            paddingVertical: 12,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
          }}
        >
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <MaterialIcons name="map" size={18} color={APP_COLORS.foreground} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: APP_COLORS.foreground }}>
              {geolocated.length} bien{geolocated.length > 1 ? 's' : ''} géolocalisé
              {geolocated.length > 1 ? 's' : ''} sur la carte
            </Text>
          </View>
          {geolocated.length > 0 && (
            <MaterialIcons name="expand-more" size={18} color={APP_COLORS.mutedForeground} />
          )}
        </TouchableOpacity>
      </View>

      {geolocated.length === 0 && (
        <View
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: 100,
            alignItems: 'center',
            gap: 6,
            borderRadius: APP_RADIUS.lg,
            backgroundColor: 'rgba(255,255,255,0.96)',
            padding: 20,
          }}
        >
          <MaterialIcons name="location-off" size={28} color={APP_COLORS.mutedForeground} />
          <Text
            style={{
              fontFamily: 'Inter_500Medium',
              fontSize: 13,
              color: APP_COLORS.mutedForeground,
              textAlign: 'center',
            }}
          >
            Aucun bien géolocalisé pour le moment — les positions sont enregistrées lors de la
            collecte terrain par nos commissionnaires.
          </Text>
        </View>
      )}

      {selected && (
        <TouchableOpacity
          onPress={() => router.push(`/property/${selected.idProperty}` as never)}
          className="flex-row items-center"
          style={{
            position: 'absolute',
            left: 20,
            right: 20,
            bottom: insets.bottom + 20,
            gap: 12,
            borderRadius: APP_RADIUS.lg,
            backgroundColor: APP_COLORS.card,
            padding: 12,
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
        >
          <View
            style={{
              height: 56,
              width: 56,
              borderRadius: APP_RADIUS.md,
              backgroundColor: APP_COLORS.muted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="home" size={26} color={APP_COLORS.mutedForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: APP_COLORS.foreground }}>
              {selected.avenue || PROPERTY_TYPE_LABELS[selected.propertyType]}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: APP_COLORS.mutedForeground, marginTop: 2 }}>
              {selected.quartier ? `${selected.quartier} · ` : ''}${selected.price.toLocaleString()}
              {selected.category === 'RENT' ? '/mois' : ''}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={APP_COLORS.mutedForeground} />
        </TouchableOpacity>
      )}

      <Modal visible={showList} animationType="slide" transparent onRequestClose={() => setShowList(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(20,23,22,0.4)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: APP_COLORS.background,
              borderTopLeftRadius: APP_RADIUS.xl,
              borderTopRightRadius: APP_RADIUS.xl,
              maxHeight: '70%',
            }}
          >
            <View
              className="flex-row items-center justify-between"
              style={{
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: APP_COLORS.border,
              }}
            >
              <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 18, color: APP_COLORS.foreground }}>
                Biens géolocalisés ({geolocated.length})
              </Text>
              <TouchableOpacity onPress={() => setShowList(false)} hitSlop={8}>
                <MaterialIcons name="close" size={22} color={APP_COLORS.mutedForeground} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={geolocated}
              keyExtractor={(item) => String(item.idProperty)}
              contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 10 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => goToProperty(item)}
                  className="flex-row items-center"
                  style={{
                    gap: 12,
                    borderRadius: APP_RADIUS.md,
                    borderWidth: 1,
                    borderColor: APP_COLORS.border,
                    padding: 12,
                  }}
                >
                  <View
                    style={{
                      height: 48,
                      width: 48,
                      borderRadius: APP_RADIUS.md,
                      backgroundColor: APP_COLORS.muted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name="place" size={22} color={APP_COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: APP_COLORS.foreground }}
                    >
                      {item.avenue || PROPERTY_TYPE_LABELS[item.propertyType]}
                    </Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: APP_COLORS.mutedForeground, marginTop: 2 }}>
                      {item.quartier ? `${item.quartier} · ` : ''}${item.price.toLocaleString()}
                      {item.category === 'RENT' ? '/mois' : ''}
                    </Text>
                  </View>
                  <MaterialIcons name="my-location" size={18} color={APP_COLORS.mutedForeground} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
