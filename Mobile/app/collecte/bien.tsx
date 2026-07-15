import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createDraftMission, addDraftPhoto } from '@/lib/repository/missionRepository';
import { compressAndHashPhoto } from '@/lib/media/photoCompression';
import { syncPendingMissions } from '@/lib/sync/syncEngine';
import type { BienPayload } from '@/lib/missions';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

const RENT_TYPES = [
  { value: 'APPARTEMENT', label: 'Appartement' },
  { value: 'MAISON', label: 'Maison' },
];
const SALE_TYPES = [
  { value: 'CONSTRUCTION_DURABLE', label: 'Construction durable' },
  { value: 'CONSTRUCTION_SEMI_DURABLE', label: 'Semi-durable' },
  { value: 'TERRAIN_PLAT', label: 'Terrain plat' },
  { value: 'TERRAIN_PENTE', label: 'Terrain en pente' },
];

const inputStyle = {
  fontFamily: 'Inter_400Regular',
  fontSize: 15,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: APP_COLORS.border,
  paddingHorizontal: 16,
  paddingVertical: 12,
  color: APP_COLORS.foreground,
} as const;

const labelStyle = {
  fontFamily: 'Inter_500Medium',
  fontSize: 13,
  color: APP_COLORS.mutedForeground,
} as const;

interface LocalPhoto {
  uri: string;
  hash: string | null;
}

export default function BienCollecteScreen() {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<'RENT' | 'SALE'>('RENT');
  const [propertyType, setPropertyType] = useState('APPARTEMENT');
  const [quartier, setQuartier] = useState('');
  const [avenue, setAvenue] = useState('');
  const [price, setPrice] = useState('');
  const [guarantee, setGuarantee] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const types = category === 'RENT' ? RENT_TYPES : SALE_TYPES;
  const canSubmit = quartier.trim().length > 0 && price.trim().length > 0;

  const switchCategory = (next: 'RENT' | 'SALE') => {
    setCategory(next);
    setPropertyType(next === 'RENT' ? 'APPARTEMENT' : 'CONSTRUCTION_DURABLE');
  };

  const capturePhoto = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });

    if (result.canceled || !result.assets?.[0]) return;

    setIsCompressingPhoto(true);
    try {
      // CLAUDE.md §8 — compression dès la prise de photo, avant tout
      // stockage local.
      const { uri, hash } = await compressAndHashPhoto(result.assets[0].uri);
      if (photos.some((p) => p.hash && p.hash === hash)) {
        return; // Déduplication via hash de fichier.
      }
      setPhotos((prev) => [...prev, { uri, hash }]);
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const removePhoto = (uri: string) => {
    setPhotos((prev) => prev.filter((p) => p.uri !== uri));
  };

  const captureLocation = async () => {
    setIsLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return;
      const position = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      // Géolocalisation optionnelle (CLAUDE.md §8) — un échec ne bloque
      // jamais la collecte.
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      const payload: BienPayload = {
        category,
        propertyType,
        quartier: quartier.trim(),
        avenue: avenue.trim() || undefined,
        price: Number.parseFloat(price),
        bedrooms: bedrooms ? Number.parseInt(bedrooms, 10) : undefined,
        description: description.trim() || undefined,
        phones: phone.trim() ? [phone.trim()] : undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
        ...(category === 'RENT'
          ? { guarantee: guarantee ? Number.parseFloat(guarantee) : undefined, unit: 'MONTH' as const }
          : {}),
      };

      const draft = await createDraftMission('COLLECTE_BIEN', payload);
      for (const photo of photos) {
        await addDraftPhoto(draft.uuid, photo.uri, photo.hash);
      }

      // Tentative de synchronisation immédiate si déjà en ligne — sinon
      // repris automatiquement au retour réseau.
      syncPendingMissions().catch(() => {});
      router.replace('/missions' as never);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ height: 36, width: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: APP_COLORS.secondary }}
        >
          <MaterialIcons name="arrow-back" size={20} color={APP_COLORS.foreground} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 20, color: APP_COLORS.foreground }}>
          Collecte de bien
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['RENT', 'SALE'] as const).map((option) => {
            const active = category === option;
            return (
              <TouchableOpacity
                key={option}
                onPress={() => switchCategory(option)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  borderRadius: APP_RADIUS.md,
                  paddingVertical: 12,
                  backgroundColor: active ? APP_COLORS.primary : APP_COLORS.secondary,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: 14,
                    color: active ? APP_COLORS.primaryForeground : APP_COLORS.mutedForeground,
                  }}
                >
                  {option === 'RENT' ? 'À louer' : 'À vendre'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={labelStyle}>Type de bien</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {types.map((option) => {
              const active = propertyType === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setPropertyType(option.value)}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    backgroundColor: active ? APP_COLORS.primary : APP_COLORS.secondary,
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

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={labelStyle}>Quartier *</Text>
            <TextInput placeholder="Ibanda" placeholderTextColor={APP_COLORS.mutedForeground} value={quartier} onChangeText={setQuartier} style={inputStyle} />
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={labelStyle}>Avenue</Text>
            <TextInput placeholder="Avenue de la Paix" placeholderTextColor={APP_COLORS.mutedForeground} value={avenue} onChangeText={setAvenue} style={inputStyle} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={labelStyle}>Prix (USD) *</Text>
            <TextInput placeholder="350" placeholderTextColor={APP_COLORS.mutedForeground} value={price} onChangeText={setPrice} keyboardType="numeric" style={inputStyle} />
          </View>
          {category === 'RENT' && (
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={labelStyle}>Garantie (mois)</Text>
              <TextInput placeholder="3" placeholderTextColor={APP_COLORS.mutedForeground} value={guarantee} onChangeText={setGuarantee} keyboardType="numeric" style={inputStyle} />
            </View>
          )}
          {category === 'SALE' && (
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={labelStyle}>Chambres</Text>
              <TextInput placeholder="3" placeholderTextColor={APP_COLORS.mutedForeground} value={bedrooms} onChangeText={setBedrooms} keyboardType="numeric" style={inputStyle} />
            </View>
          )}
        </View>

        {category === 'RENT' && (
          <View style={{ gap: 8 }}>
            <Text style={labelStyle}>Chambres</Text>
            <TextInput placeholder="3" placeholderTextColor={APP_COLORS.mutedForeground} value={bedrooms} onChangeText={setBedrooms} keyboardType="numeric" style={inputStyle} />
          </View>
        )}

        <View style={{ gap: 8 }}>
          <Text style={labelStyle}>Téléphone de contact</Text>
          <TextInput placeholder="+243 999 999 999" placeholderTextColor={APP_COLORS.mutedForeground} value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={inputStyle} />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={labelStyle}>Détails supplémentaires</Text>
          <TextInput
            placeholder="Description du bien..."
            placeholderTextColor={APP_COLORS.mutedForeground}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ ...inputStyle, minHeight: 80 }}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={labelStyle}>Photos</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {photos.map((photo) => (
              <View key={photo.uri} style={{ position: 'relative' }}>
                <Image source={{ uri: photo.uri }} style={{ width: 72, height: 72, borderRadius: 12 }} />
                <TouchableOpacity
                  onPress={() => removePhoto(photo.uri)}
                  style={{
                    position: 'absolute',
                    right: -4,
                    top: -4,
                    height: 20,
                    width: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 999,
                    backgroundColor: APP_COLORS.destructive,
                  }}
                >
                  <MaterialIcons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => capturePhoto(true)}
              disabled={isCompressingPhoto}
              style={{
                height: 72,
                width: 72,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 14,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: APP_COLORS.border,
              }}
            >
              {isCompressingPhoto ? (
                <ActivityIndicator size="small" color={APP_COLORS.primary} />
              ) : (
                <MaterialIcons name="camera-alt" size={22} color={APP_COLORS.mutedForeground} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => capturePhoto(false)}
              disabled={isCompressingPhoto}
              style={{
                height: 72,
                width: 72,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 14,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: APP_COLORS.border,
              }}
            >
              <MaterialIcons name="photo-library" size={22} color={APP_COLORS.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={captureLocation}
          disabled={isLocating}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: APP_COLORS.border,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={APP_COLORS.primary} />
          ) : (
            <MaterialIcons name="my-location" size={18} color={location ? APP_COLORS.success : APP_COLORS.mutedForeground} />
          )}
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: APP_COLORS.foreground }}>
            {location
              ? `Position enregistrée (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`
              : 'Capturer la position GPS (optionnel)'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSaving || !canSubmit}
          style={{
            alignItems: 'center',
            borderRadius: 14,
            backgroundColor: APP_COLORS.primary,
            paddingVertical: 16,
            opacity: isSaving || !canSubmit ? 0.6 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color={APP_COLORS.primaryForeground} />
          ) : (
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: APP_COLORS.primaryForeground }}>
              Enregistrer
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
