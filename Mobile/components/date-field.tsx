import { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

// GOAL 21 (post-mission) — sélecteur de date natif, remplace le champ
// texte "AAAA-MM-JJ" de la première version. La valeur voyagée reste une
// chaîne "AAAA-MM-JJ" (format `DATEONLY` du Backend, `Task.dateEcheance`)
// — construite/lue à partir des composants locaux de `Date` (jamais via
// `toISOString`/`new Date(string)` bruts, qui décaleraient le jour dans
// certains fuseaux horaires négatifs).
const toDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateString = (s: string): Date => {
  const [year, month, day] = s.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DateField({ value, onChange, placeholder = 'Aucune échéance' }: DateFieldProps) {
  const [showIosPicker, setShowIosPicker] = useState(false);
  const dateValue = value ? parseDateString(value) : new Date();

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dateValue,
        mode: 'date',
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) {
            onChange(toDateString(selected));
          }
        },
      });
    } else {
      setShowIosPicker((prev) => !prev);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity
          onPress={openPicker}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: APP_COLORS.border,
            borderRadius: APP_RADIUS.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <MaterialIcons name="event" size={17} color={APP_COLORS.mutedForeground} />
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              color: value ? APP_COLORS.foreground : APP_COLORS.mutedForeground,
            }}
          >
            {value ? dateValue.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : placeholder}
          </Text>
        </TouchableOpacity>
        {value !== '' && (
          <TouchableOpacity
            onPress={() => onChange('')}
            hitSlop={8}
            style={{
              height: 44,
              width: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: APP_RADIUS.md,
              backgroundColor: APP_COLORS.muted,
            }}
          >
            <MaterialIcons name="close" size={18} color={APP_COLORS.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {Platform.OS === 'ios' && showIosPicker && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="inline"
          onChange={(event, selected) => {
            if (event.type === 'set' && selected) {
              onChange(toDateString(selected));
            }
            setShowIosPicker(false);
          }}
        />
      )}
    </View>
  );
}
