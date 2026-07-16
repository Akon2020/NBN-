import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// MOBILE-G05 — enregistre le token Expo Push auprès du Backend
// (POST /api/notifications/push-token) après une connexion réussie.
// `getExpoPushTokenAsync` exige un projectId EAS lié — ce projet n'en a
// pas encore (CLAUDE.md §16, point ouvert). Échec traité comme un état
// normal, jamais une erreur qui romprait le login : la Notification reste
// consultable via l'API REST indépendamment du sort du push (même
// principe que PushProvider côté Backend, utils/pushProvider.js).
export const registerPushToken = async (): Promise<void> => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      // Pas de projet EAS lié — pas de token Expo Push disponible pour le
      // moment, on n'insiste pas (voir commentaire ci-dessus).
      return;
    }

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.post('/api/notifications/push-token', { expoPushToken });
  } catch {
    // Silencieux par conception — l'absence de push ne doit jamais
    // empêcher l'utilisateur d'utiliser l'app.
  }
};
