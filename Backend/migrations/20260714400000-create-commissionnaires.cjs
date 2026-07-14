"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("commissionnaires", {
      idCommissionnaire: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      idPerson: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "persons", key: "idPerson" },
        onDelete: "CASCADE",
      },
      code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      zone: { type: Sequelize.STRING(150), allowNull: true },
      niveau: {
        type: Sequelize.ENUM("JUNIOR", "CONFIRME", "SENIOR"),
        allowNull: false,
        defaultValue: "JUNIOR",
      },
      statut: {
        type: Sequelize.ENUM("ACTIF", "OBSERVATION", "SUSPENDU", "EXCLU"),
        allowNull: false,
        defaultValue: "ACTIF",
      },
      scorePerformance: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      scoreQualite: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      scoreDiscipline: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 25 },
      scoreEngagement: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      scoreGlobal: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 25 },
      dateDebutActivite: { type: Sequelize.DATEONLY, allowNull: true },
      createdBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("commissionnaires");
  },
};
