import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { APP_COLORS } from '@/constants/theme-app';

// Arborescence "Interne" — agents/employés (tâches, collecte terrain non
// commissionnée, RH). Écrans placeholders pour l'instant (sauf "Biens").
export default function InterneLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: APP_COLORS.background },
        headerTintColor: APP_COLORS.foreground,
        headerShadowVisible: false,
        tabBarActiveTintColor: APP_COLORS.primary,
        tabBarInactiveTintColor: APP_COLORS.mutedForeground,
        tabBarStyle: { backgroundColor: APP_COLORS.background, borderTopColor: APP_COLORS.border },
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Tableau de bord',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="biens"
        options={{
          title: 'Biens',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="taches"
        options={{
          title: 'Tâches',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="checklist" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bell.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
