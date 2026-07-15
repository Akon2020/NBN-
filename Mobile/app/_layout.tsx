import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Manrope_500Medium, Manrope_600SemiBold } from '@expo-google-fonts/manrope';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

// MOBILE-G01/G02 : squelette de navigation par profil. Trois arborescences
// distinctes ((commissionnaire), (client), (interne)) plus un onboarding
// de marque et un vrai login (voir app/index.tsx pour la logique de
// routage entre les trois).
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    ...MaterialIcons.font,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(commissionnaire)" />
        <Stack.Screen name="(client)" />
        <Stack.Screen name="(interne)" />
        <Stack.Screen name="property/[id]" />
        <Stack.Screen name="collecte/nouveau" />
        <Stack.Screen name="collecte/bien" />
        <Stack.Screen name="collecte/client" />
        <Stack.Screen name="collecte/suivi" />
      </Stack>
      {/* L'app est en thème clair partout sauf l'onboarding (photo plein
          cadre) — "auto" suit le mode sombre du téléphone et peut poser des
          icônes blanches invisibles sur nos fonds clairs. `onboarding.tsx`
          surcharge localement avec style="light" pendant son affichage. */}
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
