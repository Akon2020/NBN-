"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("employeeProfiles", {
      idEmployeeProfile: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      idPerson: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "persons", key: "idPerson" },
        onDelete: "CASCADE",
      },
      idService: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "services", key: "idService" },
      },
      idPoste: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "postes", key: "idPoste" },
      },
      idResponsable: {
        // lien hiérarchique — self-référence vers un autre EmployeeProfile
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "employeeProfiles", key: "idEmployeeProfile" },
      },
      contractType: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("ACTIVE", "INACTIVE"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("employeeProfiles");
  },
};
