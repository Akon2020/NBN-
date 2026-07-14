import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Arborescence "Commissionnaire" — collecte terrain (biens, clients),
// suivi de ses apports et de ses commissions. Écrans placeholders pour
// l'instant (contenu réel : MOBILE-G04, offline-first).
export default function CommissionnaireLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colorScheme === 'dark' ? '#F25414' : '#C13F0B',
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
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
