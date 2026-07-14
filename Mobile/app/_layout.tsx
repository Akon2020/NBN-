import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';

// MOBILE-G01 : squelette de navigation par profil. Trois arborescences
// distinctes ((commissionnaire), (client), (interne)) coexistent ; l'écran
// racine (index) sert de sélecteur de rôle "en dur" en attendant
// l'authentification réelle (Milestone 1). Aucune logique métier ici.
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(commissionnaire)" />
        <Stack.Screen name="(client)" />
        <Stack.Screen name="(interne)" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
