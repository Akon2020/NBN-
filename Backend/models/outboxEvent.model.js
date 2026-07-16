import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4/§7 — outbox pattern réservé aux effets secondaires dont la
// perte serait coûteuse (paiement, changement de statut de compte), pas
// systématique pour toute notification. Une ligne ici représente une
// tentative de livraison (push) à retenter jusqu'à succès ou abandon —
// la Notification elle-même (source de vérité, consultable via l'API
// REST) existe déjà en base indépendamment du sort de cette tentative.
const OutboxEvent = db.define(
  "outboxEvents",
  {
    idOutboxEvent: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    eventType: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    payload: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    statut: {
      type: DataTypes.ENUM("PENDING", "PROCESSING", "SENT", "FAILED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  { timestamps: true, updatedAt: false }
);

export default OutboxEvent;
