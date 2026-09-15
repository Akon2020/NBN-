import axios from "axios";

export const UNREACHABLE_MESSAGE =
  "Serveur injoignable. Vérifiez votre connexion internet puis réessayez.";

// Message à montrer à l'utilisateur après un appel API raté.
// - Le Backend explique toujours son refus dans `message` : on le reprend.
// - Sans réponse du tout, le problème est réseau (API en veille sur le
//   cPanel, connexion coupée) : le dire explicitement, plutôt qu'un
//   « erreur lors de l'enregistrement » qui laisse croire que la saisie
//   est en cause et pousse à tout recommencer.
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) return "Erreur inconnue";
  if (!error.response) return UNREACHABLE_MESSAGE;
  return error.response.data?.message || fallback;
};
