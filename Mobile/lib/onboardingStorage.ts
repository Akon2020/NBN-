import AsyncStorage from '@react-native-async-storage/async-storage';

// État d'interface non sensible (contrairement aux tokens, cf.
// lib/secureStore.ts) — AsyncStorage est le choix idiomatique ici.
const ONBOARDING_SEEN_KEY = 'nbn_onboarding_seen';

export async function hasSeenOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
  return value === 'true';
}

export async function markOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
}
