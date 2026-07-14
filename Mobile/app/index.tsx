import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { getAccessToken } from '@/lib/secureStore';
import { getCurrentUser, roleToHomeRoute } from '@/lib/auth';
import { hasSeenOnboarding } from '@/lib/onboardingStorage';

// Écran de décision, sans UI propre (les polices/le splash natif restent
// affichés le temps de trancher) : session active -> arborescence du rôle ;
// sinon onboarding de marque une seule fois, puis login (MOBILE-G01/G02).
export default function RouteDecisionScreen() {
  useEffect(() => {
    const decide = async () => {
      const token = await getAccessToken();
      if (token) {
        const user = await getCurrentUser();
        if (user) {
          router.replace(roleToHomeRoute(user.role) as never);
          return;
        }
      }

      const seen = await hasSeenOnboarding();
      router.replace(seen ? '/login' : '/onboarding');
    };

    decide();
  }, []);

  return <View className="flex-1 bg-white dark:bg-neutral-900" />;
}
