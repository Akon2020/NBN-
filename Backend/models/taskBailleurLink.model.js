import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — voir taskPropertyLink.model.js pour la justification des
// tables de liaison explicites par type.
const TaskBailleurLink = db.define(
  "taskBailleurLinks",
  {
    idTaskBailleurLink: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idTask: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    idBailleur: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
    indexes: [{ unique: true, fields: ["idTask", "idBailleur"] }],
  }
);

export default TaskBailleurLink;
