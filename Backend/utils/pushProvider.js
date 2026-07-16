// CLAUDE.md §7 — abstraction PushProvider, implémentation initiale Expo
// Push. Un seul appel `fetch` vers l'API Expo (pas de SDK serveur dédié :
// `expo-server-sdk` ajouterait une dépendance pour ~15 lignes de logique,
// contraire à la contrainte "application légère" tant que le volume
// d'envoi reste modeste). Remplaçable par un autre provider (FCM natif,
// etc.) sans toucher au reste du code — seul `sendPushNotification` est
// consommé à l'extérieur de ce fichier.
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// MOBILE-G05 câble l'enregistrement du token — tant qu'un utilisateur n'a
// jamais ouvert l'app mobile (ou a refusé les notifications),
// `expoPushToken` est null et l'envoi est délibérément sauté (jamais une
// erreur : l'absence de token n'est pas un échec, c'est un état normal).
export const sendPushNotification = async (expoPushToken, { title, body, data }) => {
  if (!expoPushToken) {
    return { status: "SKIPPED", error: "Aucun token push enregistré pour ce compte." };
  }

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        title,
        body,
        data: data || {},
      }),
    });

    const result = await response.json();
    const ticket = Array.isArray(result?.data) ? result.data[0] : result?.data;

    if (!response.ok || ticket?.status === "error") {
      return { status: "FAILED", error: ticket?.message || `HTTP ${response.status}` };
    }

    return { status: "SENT" };
  } catch (error) {
    return { status: "FAILED", error: error.message };
  }
};
