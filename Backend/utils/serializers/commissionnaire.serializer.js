import { hasPermission } from "../rbac.js";

// Fiche commissionnaire / collecteur : les chemins des pièces d'identité ne
// quittent jamais le serveur (consultation par la route dédiée), et le
// numéro de la pièce n'est visible qu'avec `commissionnaires:identity:read`.
const stripPerson = (person, canReadIdentity) => {
  if (!person) return person;
  const plain = { ...person };
  plain.hasIdDocument = Boolean(plain.idDocumentPath);
  plain.hasIdDocumentVerso = Boolean(plain.idDocumentVersoPath);
  delete plain.idDocumentPath;
  delete plain.idDocumentMimeType;
  delete plain.idDocumentVersoPath;
  delete plain.idDocumentVersoMimeType;
  if (!canReadIdentity) delete plain.idNumber;
  return plain;
};

export const serializeCommissionnaire = (commissionnaire, { canReadIdentity }) => {
  const plain =
    typeof commissionnaire?.toJSON === "function" ? commissionnaire.toJSON() : { ...commissionnaire };
  if (plain.person) plain.person = stripPerson(plain.person, canReadIdentity);
  plain.missingIdDocument = plain.person ? !plain.person.hasIdDocument : true;
  return plain;
};

export const commissionnaireAccess = async (user) => ({
  canReadIdentity: await hasPermission(user, "commissionnaires:identity:read"),
});

// Vue du commissionnaire sur sa propre fiche : jamais sa notation (scores,
// classement, incidents), ni qui l'a créé.
const SELF_HIDDEN = [
  "scorePerformance",
  "scoreQualite",
  "scoreDiscipline",
  "scoreEngagement",
  "scoreGlobal",
  "classement",
  "incidents",
  "niveau",
  "createdBy",
];

export const serializeOwnCommissionnaire = (commissionnaire) => {
  const plain = serializeCommissionnaire(commissionnaire, { canReadIdentity: true });
  for (const field of SELF_HIDDEN) delete plain[field];
  return plain;
};
