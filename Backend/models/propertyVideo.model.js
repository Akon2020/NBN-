import { DataTypes } from "sequelize";
import db from "../database/db.js";

// GOAL 2 — table dédiée (jamais une colonne "type" polymorphe sur
// PropertyImage) : une vidéo a des contraintes propres (MIME, taille,
// pas de compression serveur — cf. upload.middleware.js), mélanger les
// deux dans une table générique "media" aurait forcé des colonnes
// nullables incohérentes selon le type.
const PropertyVideo = db.define("propertyVideos", {
  idPropertyVideo: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  idProperty: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: "properties",
      key: "idProperty",
    },
  },
  video: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
});

export default PropertyVideo;
