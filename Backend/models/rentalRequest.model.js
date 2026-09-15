import { DataTypes } from "sequelize";
import db from "../database/db.js";

// Demande de location soumise via le formulaire public (landing page).
// Trace figée de la demande telle que le client l'a exprimée — le suivi
// commercial vit sur le `Client` créé à partir d'elle (statutPipeline),
// jamais sur cette table : une demande n'est pas un dossier en cours,
// c'est son point de départ.
const RentalRequest = db.define(
  "rentalRequests",
  {
    idRentalRequest: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

    fullName: { type: DataTypes.STRING(150), allowNull: false },
    phone: { type: DataTypes.STRING(30), allowNull: false },
    // Obligatoire dans le formulaire depuis la phase 1 (accusé de réception,
    // bouton « Contacter »), nullable pour les demandes plus anciennes.
    email: { type: DataTypes.STRING(150), allowNull: true },
    lieuProvenance: DataTypes.STRING(150),
    residenceActuelle: DataTypes.STRING(150),
    sexe: { type: DataTypes.ENUM("MASCULIN", "FEMININ"), allowNull: true },
    typeClient: {
      type: DataTypes.ENUM("PARTICULIER", "PROFESSIONNEL", "ENTREPRISE", "EXPATRIE"),
      allowNull: true,
    },
    canalContact: {
      type: DataTypes.ENUM("TERRAIN", "APPEL", "WHATSAPP", "RESEAU", "AUTRE"),
      allowNull: true,
    },
    canalContactAutre: DataTypes.STRING(150),

    typesBien: DataTypes.JSON,
    typeBienAutre: DataTypes.STRING(150),
    usageBien: {
      type: DataTypes.ENUM("HABITATION", "BUREAU", "COMMERCIAL", "MIXTE"),
      allowNull: true,
    },

    ville: { type: DataTypes.ENUM("BUKAVU", "AUTRE"), allowNull: true },
    villeAutre: DataTypes.STRING(150),
    commune: { type: DataTypes.ENUM("IBANDA", "KADUTU", "BAGIRA"), allowNull: true },
    quartier: DataTypes.STRING(150),
    avenues: DataTypes.TEXT,

    budgetMin: DataTypes.DECIMAL(12, 2),
    loyerMax: DataTypes.DECIMAL(12, 2),
    devise: { type: DataTypes.ENUM("USD", "CDF"), allowNull: false, defaultValue: "USD" },
    modalitePaiement: {
      type: DataTypes.ENUM(
        "AVANCE_1_GARANTIE_3",
        "MENSUEL",
        "AVANCE_2_GARANTIE_3",
        "AVANCE_3_GARANTIE_2",
        "AVANCE_3_GARANTIE_3",
        "GARANTIE_6",
        "AUTRE"
      ),
      allowNull: true,
    },
    modalitePaiementAutre: DataTypes.STRING(255),
    chargesIncluses: { type: DataTypes.ENUM("OUI", "NON", "PARTIELLEMENT"), allowNull: true },

    nombreChambres: DataTypes.STRING(20),
    nombreChambresAutre: DataTypes.STRING(50),
    nombreSalons: DataTypes.STRING(20),
    nombreToilettes: DataTypes.STRING(20),
    equipements: DataTypes.JSON,
    avantages: DataTypes.JSON,
    avantageAutre: DataTypes.STRING(255),

    urgence: {
      type: DataTypes.ENUM("IMMEDIAT", "1_2_SEMAINES", "1_MOIS", "FLEXIBLE", "AUTRE"),
      allowNull: true,
    },
    urgenceAutre: DataTypes.STRING(150),
    dateEntree: DataTypes.DATEONLY,

    typeOccupants: {
      type: DataTypes.ENUM("FAMILLE_NOMBREUSE", "FAMILLE_PEU_NOMBREUSE", "COUPLE", "AUTRE"),
      allowNull: true,
    },
    // Précisé par le client quand `typeOccupants` vaut AUTRE.
    nombreOccupants: DataTypes.INTEGER,
    elementsParticuliers: DataTypes.JSON,
    orienteParAgent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    codeCommissionnaire: DataTypes.STRING(50),
    autresInfos: DataTypes.TEXT,

    conditionsAcceptedAt: { type: DataTypes.DATE, allowNull: false },

    idClient: { type: DataTypes.BIGINT, allowNull: true },
  },
  { timestamps: true }
);

export default RentalRequest;
