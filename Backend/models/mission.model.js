import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CDC §7 — mission terrain (collecte de bien, apport client, suivi) avec
// écran de validation Valider/Rejeter/Demander correction (BACK-G10).
// `uuid` : généré côté client Mobile dès la création locale (CLAUDE.md §8)
// pour garantir l'idempotence d'une soumission en cas de resynchronisation
// après coupure réseau — jamais l'auto-increment `idMission` comme clé
// d'idempotence, il n'existe qu'après écriture serveur réussie.
const Mission = db.define(
  "missions",
  {
    idMission: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    uuid: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true,
    },
    idCommissionnaire: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("COLLECTE_BIEN", "APPORT_CLIENT", "SUIVI"),
      allowNull: false,
    },
    statut: {
      type: DataTypes.ENUM("SOUMISE", "VALIDEE", "REJETEE", "CORRECTION_DEMANDEE"),
      allowNull: false,
      defaultValue: "SOUMISE",
    },
    idProperty: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    idClient: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    motifRejet: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    validatedBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    validatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // BACK-G21 — mêmes principes que Requisition ci-dessus : archivage
    // métier orthogonal au `statut` de la mission, `deletedAt` (paranoid)
    // réservé à l'erreur de saisie.
    archivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    archiveReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { timestamps: true, paranoid: true }
);

export default Mission;
