import { DataTypes } from "sequelize";
import db from "../database/db.js";

// GOAL 3 — historique chronologique réel pour les quatre entités centrales
// (bien, client, commissionnaire, bailleur). `entityType`/`entityId` est un
// **soft reference** volontaire (CLAUDE.md §4) : contrairement aux tables
// de liaison explicites (TaskPropertyLink et consorts, qui portent une
// vraie intégrité référentielle Sequelize), un événement de timeline est un
// journal append-only, jamais une relation métier vivante — le nombre de
// types d'entités journalisées est borné (4) et connu, mais la timeline
// elle-même n'a jamais besoin d'un JOIN garanti par une FK (même précédent
// que Notification/Alert/Reminder/CalendarEvent, déjà documenté).
const TimelineEvent = db.define(
  "timelineEvents",
  {
    idTimelineEvent: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    entityType: {
      type: DataTypes.ENUM("PROPERTY", "CLIENT", "COMMISSIONNAIRE", "BAILLEUR", "MISSION", "TASK"),
      allowNull: false,
    },
    entityId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    eventType: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    actorUserId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    occurredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
    indexes: [{ fields: ["entityType", "entityId", "occurredAt"] }],
  }
);

export default TimelineEvent;
