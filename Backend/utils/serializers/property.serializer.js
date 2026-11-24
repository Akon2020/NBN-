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

// Lecture publique (landing page, application mobile sans compte) : liste
// blanche stricte. Un visiteur anonyme ne voit jamais l'informateur, le
// code commissionnaire, les observations internes, les coordonnées GPS,
// l'adresse complète, les scores ni l'auteur de la fiche.
const PUBLIC_FIELDS = [
  "idProperty",
  "category",
  "propertyType",
  "commune",
  "quartier",
  "avenue",
  "floors",
  "bedrooms",
  "livingRooms",
  "toilets",
  "kitchens",
  "hasElectricity",
  "hasWater",
  "price",
  "modalitePaiement",
  "description",
  "statut",
  "createdAt",
];

export const serializePublicProperty = (property) => {
  const plain =
    property && typeof property.toJSON === "function"
      ? property.toJSON()
      : { ...property };
  const result = {};
  for (const field of PUBLIC_FIELDS) {
    if (plain[field] !== undefined) result[field] = plain[field];
  }
  if (plain.rentalDetails) {
    result.rentalDetails = {
      guarantee: plain.rentalDetails.guarantee,
      unit: plain.rentalDetails.unit,
    };
  }
  result.images = (plain.images || []).map((image) => ({
    idPropertyImage: image.idPropertyImage,
    image: image.image,
    order: image.order,
  }));
  result.videos = (plain.videos || []).map((video) => ({
    idPropertyVideo: video.idPropertyVideo,
    video: video.video,
    order: video.order,
  }));
  return result;
};
