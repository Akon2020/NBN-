import { DataTypes } from "sequelize";
import db from "../database/db.js";

// Assignation multi-collaborateurs (CDC — "assignation, attribution").
const TaskAssignee = db.define(
  "taskAssignees",
  {
    idTaskAssignee: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idTask: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    idUser: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
    indexes: [{ unique: true, fields: ["idTask", "idUser"] }],
  }
);

export default TaskAssignee;
