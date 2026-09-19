import { hasPermission } from "../rbac.js";

// BACK-G03 — Field-level authorization générique côté sérialisation
// (CLAUDE.md §5) : le filtrage se fait ici, dans une couche centralisée par
// ressource — jamais via un `if` isolé dispersé dans un contrôleur.

// Droits évalués une seule fois par réponse : une liste de 300 biens ne
// déclenche pas 900 lectures de permissions.
const resolveFieldAccess = async (user) => {
  const [margin, prixMinimum, bailleurLink] = await Promise.all([
    hasPermission(user, "property:margin:read"),
    hasPermission(user, "property:prix_minimum:read"),
    hasPermission(user, "bailleurs:read"),
  ]);
  return { margin, prixMinimum, bailleurLink };
};

const applyFieldAccess = (property, access) => {
  const plain =
    property && typeof property.toJSON === "function"
      ? property.toJSON()
      : { ...property };

  if (!access.margin) {
    delete plain.margin;
    delete plain.marginOverridePercentage;
  }

  // Le prix minimum acceptable révèle jusqu'où le responsable peut
  // descendre : réservé à l'administration, sinon la négociation est
  // perdue d'avance.
  if (!access.prixMinimum) {
    delete plain.prixMinimum;
  }

  // Le lien bien ↔ bailleur est confidentiel (demande de l'agence) : il ne
  // se voit que dans Bailleurs et Galerie, pour les rôles qui gèrent les
  // bailleurs. Les numéros du bien sont ceux du responsable (collecte) :
  // même règle.
  if (!access.bailleurLink) {
    delete plain.idBailleur;
    delete plain.phones;
  }

  return plain;
};

export const serializeProperty = async (property, user) =>
  applyFieldAccess(property, await resolveFieldAccess(user));

export const serializeProperties = async (properties, user) => {
  const access = await resolveFieldAccess(user);
  return properties.map((property) => applyFieldAccess(property, access));
};
