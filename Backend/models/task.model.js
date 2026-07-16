import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — module Tasks générique (vue Kanban/liste, assignation
// multi-collaborateurs). Le statut d'une Task ne pilote JAMAIS l'état
// métier d'une ressource liée (property.statut, client.statutPipeline,
// etc. restent des sources de vérité séparées et autonomes) — appliqué
// dans task.controller.js en ne touchant jamais une ressource liée lors
// d'un changement de statut de tâche.
const Task = db.define(
  "tasks",
  {
    idTask: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM("A_FAIRE", "EN_COURS", "EN_REVISION", "TERMINEE"),
      allowNull: false,
      defaultValue: "A_FAIRE",
    },
    priorite: {
      type: DataTypes.ENUM("BASSE", "NORMALE", "HAUTE", "URGENTE"),
      allowNull: false,
      defaultValue: "NORMALE",
    },
    dateEcheance: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  { timestamps: true }
);

export default Task;
