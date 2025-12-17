import { DataTypes } from "sequelize";
import db from "../database/db.js";

const ActivityLog = db.define("activityLogs", {
  idActivityLog: {
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
  action: DataTypes.STRING,
  entity: DataTypes.STRING,
  entityId: DataTypes.BIGINT,
});

export default ActivityLog;
