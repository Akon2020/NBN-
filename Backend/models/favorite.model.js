import { DataTypes } from "sequelize";
import db from "../database/db.js";

const Favorite = db.define(
  "favorites",
  {
    idFavorite: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idUser: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: "users",
        key: "idUser",
      },
    },
    idProperty: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: "properties",
        key: "idProperty",
      },
    },
    madeAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  { timestamps: true }
);

export default Favorite;
