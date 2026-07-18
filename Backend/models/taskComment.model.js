import { DataTypes } from "sequelize";
import db from "../database/db.js";

// GOAL 15 — fil de discussion append-only par tâche : jamais d'édition de
// contenu après publication, seule la suppression (auteur ou tasks:manage)
// est permise côté contrôleur.
const TaskComment = db.define(
  "taskComments",
  {
    idTaskComment: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idTask: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    authorId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  { timestamps: true }
);

export default TaskComment;
