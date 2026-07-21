import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { getUsersDirectory, type UserDirectoryEntry } from '@/lib/directory';
import { APP_COLORS } from '@/constants/theme-app';

// GOAL 21 (post-mission) — sélection d'assignés pour une tâche : une ou
// plusieurs personnes de l'annuaire ("groupe" = plusieurs personnes
// sélectionnées, il n'existe pas d'entité "équipe" nommée dans ce
// système — cf. CLAUDE.md, aucune notion de groupe/team n'est modélisée
// côté Backend). Même endpoint que le sélecteur d'assignation déjà
// utilisé côté Frontend Admin (GET /api/users/directory, GOAL 11).
interface UserMultiSelectProps {
  selectedUserIds: number[];
  onChange: (userIds: number[]) => void;
}

export function UserMultiSelect({ selectedUserIds, onChange }: UserMultiSelectProps) {
  const [users, setUsers] = useState<UserDirectoryEntry[] | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getUsersDirectory()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const toggle = (idUser: number) => {
    onChange(
      selectedUserIds.includes(idUser)
        ? selectedUserIds.filter((id) => id !== idUser)
        : [...selectedUserIds, idUser]
    );
  };

  const filtered = (users || []).filter((u) =>
    u.fullName.toLowerCase().includes(search.trim().toLowerCase())
  );

  if (users === null) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <ActivityIndicator color={APP_COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderRadius: 999,
          backgroundColor: APP_COLORS.muted,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <MaterialIcons name="search" size={18} color={APP_COLORS.mutedForeground} />
        <TextInput
          placeholder="Rechercher une personne..."
          placeholderTextColor={APP_COLORS.mutedForeground}
          value={search}
          onChangeText={setSearch}
          style={{ flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, color: APP_COLORS.foreground }}
        />
      </View>

      {selectedUserIds.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {selectedUserIds.map((idUser) => {
            const user = users.find((u) => u.idUser === idUser);
            if (!user) return null;
            return (
              <TouchableOpacity
                key={idUser}
                onPress={() => toggle(idUser)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  borderRadius: 999,
                  paddingLeft: 12,
                  paddingRight: 8,
                  paddingVertical: 6,
                  backgroundColor: APP_COLORS.primary,
                }}
              >
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: APP_COLORS.primaryForeground }}>
                  {user.fullName}
                </Text>
                <MaterialIcons name="close" size={13} color={APP_COLORS.primaryForeground} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
        {filtered.map((user) => {
          const active = selectedUserIds.includes(user.idUser);
          return (
            <TouchableOpacity
              key={user.idUser}
              onPress={() => toggle(user.idUser)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 4,
                borderBottomWidth: 1,
                borderBottomColor: APP_COLORS.border,
              }}
            >
              <MaterialIcons
                name={active ? 'check-box' : 'check-box-outline-blank'}
                size={20}
                color={active ? APP_COLORS.primary : APP_COLORS.mutedForeground}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13.5, color: APP_COLORS.foreground }}>
                  {user.fullName}
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11.5, color: APP_COLORS.mutedForeground }}>
                  {user.role}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {filtered.length === 0 && (
          <Text
            style={{
              textAlign: 'center',
              paddingVertical: 16,
              fontFamily: 'Inter_400Regular',
              fontSize: 12.5,
              color: APP_COLORS.mutedForeground,
            }}
          >
            Aucune personne trouvée
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
