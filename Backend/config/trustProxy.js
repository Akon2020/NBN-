// En production, l'API tourne derrière le reverse proxy du cPanel
// (openresty → Passenger). Sans `trust proxy`, Express prend l'IP du
// proxy pour celle du client : tous les utilisateurs partagent alors la
// même adresse, et donc le même quota du rate limiter — dix connexions
// ratées n'importe où dans l'agence bloquent la connexion de tout le
// monde pendant quinze minutes.
//
// `TRUST_PROXY` accepte les valeurs d'Express : un nombre de sauts
// ("1"), un booléen ("true"/"false"), ou une liste d'adresses/sous-réseaux
// ("loopback, 10.0.0.0/8"). Non renseignée : un saut en production (un
// seul proxy devant l'application), aucun en développement, où la
// requête arrive directement et un en-tête X-Forwarded-For ne serait
// qu'une valeur forgée par le client.
export const resolveTrustProxy = (raw, nodeEnv) => {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return nodeEnv === "production" ? 1 : false;
  }

  const value = String(raw).trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
};
