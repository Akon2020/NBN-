import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

export interface PropertyFilters {
  minBedrooms: number | null;
  minToilets: number | null;
  minPrice: string;
  maxPrice: string;
}

export const EMPTY_FILTERS: PropertyFilters = {
  minBedrooms: null,
  minToilets: null,
  minPrice: '',
  maxPrice: '',
};

export const countActiveFilters = (filters: PropertyFilters): number =>
  [
    filters.minBedrooms !== null,
    filters.minToilets !== null,
    filters.minPrice.trim() !== '',
    filters.maxPrice.trim() !== '',
  ].filter(Boolean).length;

const COUNT_OPTIONS = [1, 2, 3, 4] as const;

function CountRow({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <MaterialIcons name={icon} size={18} color={APP_COLORS.foreground} />
        <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: APP_COLORS.foreground }}>
          {label}
        </Text>
      </View>
      <View className="flex-row" style={{ gap: 8 }}>
        <TouchableOpacity
          onPress={() => onChange(null)}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 10,
            borderRadius: APP_RADIUS.md,
            borderWidth: 1,
            borderColor: value === null ? APP_COLORS.foreground : APP_COLORS.border,
            backgroundColor: value === null ? APP_COLORS.foreground : APP_COLORS.background,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter_500Medium',
              fontSize: 13,
              color: value === null ? APP_COLORS.background : APP_COLORS.mutedForeground,
            }}
          >
            Indifférent
          </Text>
        </TouchableOpacity>
        {COUNT_OPTIONS.map((count) => {
          const active = value === count;
          return (
            <TouchableOpacity
              key={count}
              onPress={() => onChange(count)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 10,
                borderRadius: APP_RADIUS.md,
                borderWidth: 1,
                borderColor: active ? APP_COLORS.foreground : APP_COLORS.border,
                backgroundColor: active ? APP_COLORS.foreground : APP_COLORS.background,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 13,
                  color: active ? APP_COLORS.background : APP_COLORS.mutedForeground,
                }}
              >
                {count}+
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

interface PropertyFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: PropertyFilters;
  onApply: (filters: PropertyFilters) => void;
  resultCount: number;
}

// Écran de filtres dédié (chambres, salles d'eau, budget) — au-delà des
// pastilles catégorie/type déjà présentes en ligne sur les écrans de
// listing. Uniquement des champs réellement présents sur `Property`
// (bedrooms, toilets, price) — jamais de filtre sur une donnée qui
// n'existe pas côté backend.
export function PropertyFilterModal({
  visible,
  onClose,
  filters,
  onApply,
  resultCount,
}: PropertyFilterModalProps) {
  const insets = useSafeAreaInsets();

  const update = (patch: Partial<PropertyFilters>) => onApply({ ...filters, ...patch });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,23,22,0.4)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: APP_COLORS.background,
            borderTopLeftRadius: APP_RADIUS.xl,
            borderTopRightRadius: APP_RADIUS.xl,
            maxHeight: '85%',
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
            <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 19, color: APP_COLORS.foreground }}>
              Filtres
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={APP_COLORS.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }}>
            <CountRow
              label="Chambres"
              icon="bed"
              value={filters.minBedrooms}
              onChange={(v) => update({ minBedrooms: v })}
            />
            <CountRow
              label="Salles d'eau"
              icon="bathtub"
              value={filters.minToilets}
              onChange={(v) => update({ minToilets: v })}
            />

            <View style={{ gap: 10 }}>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <MaterialIcons name="payments" size={18} color={APP_COLORS.foreground} />
                <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: APP_COLORS.foreground }}>
                  Budget ($)
                </Text>
              </View>
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <TextInput
                  placeholder="Min"
                  placeholderTextColor={APP_COLORS.mutedForeground}
                  keyboardType="numeric"
                  value={filters.minPrice}
                  onChangeText={(v) => update({ minPrice: v })}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: APP_COLORS.border,
                    borderRadius: APP_RADIUS.md,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontFamily: 'Inter_400Regular',
                    fontSize: 14,
                    color: APP_COLORS.foreground,
                  }}
                />
                <Text style={{ color: APP_COLORS.mutedForeground }}>—</Text>
                <TextInput
                  placeholder="Max"
                  placeholderTextColor={APP_COLORS.mutedForeground}
                  keyboardType="numeric"
                  value={filters.maxPrice}
                  onChangeText={(v) => update({ maxPrice: v })}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: APP_COLORS.border,
                    borderRadius: APP_RADIUS.md,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontFamily: 'Inter_400Regular',
                    fontSize: 14,
                    color: APP_COLORS.foreground,
                  }}
                />
              </View>
            </View>
          </ScrollView>

          <View
            className="flex-row"
            style={{
              gap: 12,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: insets.bottom + 16,
              borderTopWidth: 1,
              borderTopColor: APP_COLORS.border,
            }}
          >
            <TouchableOpacity
              onPress={() => onApply(EMPTY_FILTERS)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 14,
                borderRadius: APP_RADIUS.md,
                borderWidth: 1,
                borderColor: APP_COLORS.border,
              }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: APP_COLORS.foreground }}>
                Réinitialiser
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 2,
                alignItems: 'center',
                paddingVertical: 14,
                borderRadius: APP_RADIUS.md,
                backgroundColor: APP_COLORS.primary,
              }}
            >
              <Text
                style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: APP_COLORS.primaryForeground }}
              >
                Voir {resultCount} résultat{resultCount > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
