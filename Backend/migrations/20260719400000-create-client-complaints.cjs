"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("clientComplaints", {
      idClientComplaint: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      idClient: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "clients", key: "idClient" },
        onDelete: "CASCADE",
      },
      subject: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      statut: {
        type: Sequelize.ENUM("OUVERTE", "RESOLUE"),
        allowNull: false,
        defaultValue: "OUVERTE",
      },
      resolution: { type: Sequelize.TEXT, allowNull: true },
      createdBy: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
      },
      resolvedBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      resolvedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("clientComplaints");
  },
};
