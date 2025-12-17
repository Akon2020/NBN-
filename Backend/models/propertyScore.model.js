import { DataTypes } from "sequelize";
import db from "../database/db.js";

const PropertyScore = db.define("propertyScores", {
  idScore: {
    type: DataTypes.BIGINT,
    primaryKey: true,
  },
  idProperty: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: "properties",
      key: "idProperty",
    },
  },
  score: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
});

export default PropertyScore;
