import { DataTypes } from "sequelize";
import db from "../database/db.js";

// GOAL 11 — assignation multi-personnes d'un rendez-vous (même patron que
// TaskAssignee) : `CalendarEvent.idUser` reste le "propriétaire" unique
// utilisé pour le filtrage de la vue calendrier existante, cette table
// ajoute les autres personnes concernées, chacune notifiée à la création.
const CalendarEventParticipant = db.define(
  "calendarEventParticipants",
  {
    idCalendarEventParticipant: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idCalendarEvent: {
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
    indexes: [{ unique: true, fields: ["idCalendarEvent", "idUser"] }],
  }
);

export default CalendarEventParticipant;
