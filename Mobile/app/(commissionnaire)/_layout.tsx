import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { APP_COLORS } from '@/constants/theme-app';

// Arborescence "Commissionnaire" — collecte terrain (biens, clients),
// suivi de ses apports (MOBILE-G04). "Missions" et "Profil" construisent
// leur propre en-tête, le header natif reste désactivé pour éviter le
// doublon.
export default function CommissionnaireLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: APP_COLORS.primary,
        tabBarInactiveTintColor: APP_COLORS.mutedForeground,
        tabBarStyle: { backgroundColor: APP_COLORS.background, borderTopColor: APP_COLORS.border },
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="missions"
        options={{
          title: 'Missions',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="briefcase.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bell.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
