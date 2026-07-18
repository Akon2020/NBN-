import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — vue calendrier agrégée (Tasks/Reminders/CRM), pas une
// duplication systématique. `CalendarEvent` n'existe comme table propre
// que pour les événements qui n'ont pas de source ailleurs (ex. un
// rendez-vous pur, sans lien à une autre entité) — voir
// calendar.controller.js pour l'agrégation avec les autres sources.
const CalendarEvent = db.define(
  "calendarEvents",
  {
    idCalendarEvent: {
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
    startAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    idUser: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  { timestamps: true }
);

export default CalendarEvent;
