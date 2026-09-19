import { hasPermission } from "../rbac.js";

// BACK-G03/BACK-G06 — même logique que property.serializer.js : la marge
// agence d'un bailleur est une donnée financière sensible (CDC §3).
export const serializeBailleur = async (bailleur, user) => {
  const plain =
    bailleur && typeof bailleur.toJSON === "function"
      ? bailleur.toJSON()
      : { ...bailleur };

  // COUNT(*) revient parfois en chaîne selon le pilote MySQL.
  if (plain.propertiesCount !== undefined) plain.propertiesCount = Number(plain.propertiesCount);

  const canReadMarge = await hasPermission(user, "bailleur:marge:read");
  if (!canReadMarge) {
    delete plain.margeAgence;
  }

  // Le chemin interne de la pièce d'identité ne quitte jamais le serveur :
  // le client sait seulement qu'elle existe, et la consulte par la route
  // dédiée (bailleurs:identity:read).
  if (plain.person) {
    const person = { ...plain.person, hasIdDocument: Boolean(plain.person.idDocumentPath) };
    delete person.idDocumentPath;
    delete person.idDocumentMimeType;
    plain.person = person;
  }

  return plain;
};

export const serializeBailleurs = async (bailleurs, user) => {
  return Promise.all(bailleurs.map((bailleur) => serializeBailleur(bailleur, user)));
};
