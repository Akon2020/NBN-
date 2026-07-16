import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — voir taskPropertyLink.model.js pour la justification des
// tables de liaison explicites par type.
const TaskClientLink = db.define(
  "taskClientLinks",
  {
    idTaskClientLink: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idTask: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    idClient: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
    indexes: [{ unique: true, fields: ["idTask", "idClient"] }],
  }
);

export default TaskClientLink;
