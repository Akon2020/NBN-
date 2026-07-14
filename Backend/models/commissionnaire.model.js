import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CDC §7 "Pilotage des commissionnaires" — fiche digitale dynamique
// rattachée à une Person (peut ou non avoir un User, CLAUDE.md §4).
//
// Score global /100 = somme de 4 sous-scores /25 chacun (performance,
// qualité, discipline, engagement) — le CDC ne donne pas de pondération
// précise entre les 4 dimensions au-delà de "score global sur 100 points",
// la répartition égale (25 chacun) est l'interprétation la plus neutre.
// Le classement (Élite/Très performant/Moyen/Risque) est dérivé du score,
// jamais stocké (voir utils/commissionnaireScoring.js).
const Commissionnaire = db.define(
  "commissionnaires",
  {
    idCommissionnaire: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idPerson: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    zone: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    niveau: {
      type: DataTypes.ENUM("JUNIOR", "CONFIRME", "SENIOR"),
      allowNull: false,
      defaultValue: "JUNIOR",
    },
    statut: {
      type: DataTypes.ENUM("ACTIF", "OBSERVATION", "SUSPENDU", "EXCLU"),
      allowNull: false,
      defaultValue: "ACTIF",
    },
    scorePerformance: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    scoreQualite: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    scoreDiscipline: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 25 },
    scoreEngagement: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    scoreGlobal: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 25 },
    dateDebutActivite: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default Commissionnaire;
