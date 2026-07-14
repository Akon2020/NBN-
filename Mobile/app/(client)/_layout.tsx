import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Arborescence "Client final" — recherche de biens et favoris. Écrans
// placeholders pour l'instant (contenu réel : Milestone 2, MOBILE-G03).
export default function ClientLayout() {
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
        name="recherche"
        options={{
          title: 'Recherche',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="favoris"
        options={{
          title: 'Favoris',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="star.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
