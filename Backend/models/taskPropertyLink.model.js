import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — table de liaison explicite par type, jamais de relation
// polymorphe générique (linkableType/linkableId) : MySQL ne peut pas
// contraindre une FK conditionnelle par type. Une table par ressource
// liable, le nombre de types étant borné et connu.
const TaskPropertyLink = db.define(
  "taskPropertyLinks",
  {
    idTaskPropertyLink: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idTask: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    idProperty: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
    indexes: [{ unique: true, fields: ["idTask", "idProperty"] }],
  }
);

export default TaskPropertyLink;
