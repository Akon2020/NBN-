import { hasPermission } from "../rbac.js";

// BACK-G03/BACK-G06 — même logique que property.serializer.js : la marge
// agence d'un bailleur est une donnée financière sensible (CDC §3).
export const serializeBailleur = async (bailleur, user) => {
  const plain =
    bailleur && typeof bailleur.toJSON === "function"
      ? bailleur.toJSON()
      : { ...bailleur };

  const canReadMarge = await hasPermission(user, "bailleur:marge:read");
  if (!canReadMarge) {
    delete plain.margeAgence;
  }

  return plain;
};

export const serializeBailleurs = async (bailleurs, user) => {
  return Promise.all(bailleurs.map((bailleur) => serializeBailleur(bailleur, user)));
};
