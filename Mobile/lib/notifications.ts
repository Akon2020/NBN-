import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { api } from './api';

// Depuis le SDK 53, Expo Go ne supporte plus du tout les notifications push
// distantes — `expo-notifications` déclenche une erreur dès son import
// (effet de bord d'enregistrement automatique), avant même qu'un try/catch
// dans nos propres fonctions puisse l'intercepter. On importe donc ce
// module dynamiquement, et uniquement hors Expo Go, pour que son code ne
// s'exécute jamais du tout pendant les tests en Expo Go — la seule façon
// d'éviter le crash, pas juste de l'attraper. Fonctionnera sans changement
// une fois l'app testée via un build de développement (EAS ou local).
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let handlerConfigured = false;

const ensureNotificationHandler = async () => {
  if (handlerConfigured || isExpoGo) return;
  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  handlerConfigured = true;
};

// MOBILE-G05 — enregistre le token Expo Push auprès du Backend
// (POST /api/notifications/push-token) après une connexion réussie.
// `getExpoPushTokenAsync` exige aussi un projectId EAS lié — ce projet n'en
// a pas encore (CLAUDE.md §16, point ouvert). Chaque cas d'absence (Expo
// Go, pas de projectId, permission refusée) est un état normal, jamais une
// erreur qui romprait le login : la Notification reste consultable via
// l'API REST indépendamment du sort du push (même principe que
// PushProvider côté Backend, utils/pushProvider.js).
export const registerPushToken = async (): Promise<void> => {
  if (isExpoGo) {
    return;
  }

  try {
    await ensureNotificationHandler();
    const Notifications = await import('expo-notifications');

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
