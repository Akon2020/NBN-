import { hasPermission } from "../rbac.js";

// BACK-G03 — Field-level authorization générique côté sérialisation :
// premier champ sensible traité, `Property.margin` (CLAUDE.md §5). Le
// filtrage se fait ici, dans une couche centralisée par ressource — jamais
// via un `if` isolé dispersé dans un contrôleur.
export const serializeProperty = async (property, user) => {
  const plain =
    property && typeof property.toJSON === "function"
      ? property.toJSON()
      : { ...property };

  const canReadMargin = await hasPermission(user, "property:margin:read");
  if (!canReadMargin) {
    delete plain.margin;
  }

  return plain;
};

export const serializeProperties = async (properties, user) => {
  return Promise.all(
    properties.map((property) => serializeProperty(property, user))
  );
};
