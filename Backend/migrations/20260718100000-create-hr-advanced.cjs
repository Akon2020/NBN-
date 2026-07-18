"use strict";

/** @type {import('sequelize-cli').Migration} */
// BACK-G22 — RH avancé (V1 minimale) : évaluations, objectifs, compétences,
// formations, tous rattachés à `employeeProfiles` (jamais à `users`
// directement, CLAUDE.md §4 — un employé peut ne pas avoir de compte).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("evaluations", {
      idEvaluation: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      idEmployeeProfile: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "employeeProfiles", key: "idEmployeeProfile" },
        onDelete: "CASCADE",
      },
      evaluatorUserId: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
      },
      period: { type: Sequelize.STRING(20), allowNull: false },
      score: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      comments: { type: Sequelize.TEXT, allowNull: true },
      evaluatedAt: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("objectives", {
      idObjective: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      idEmployeeProfile: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "employeeProfiles", key: "idEmployeeProfile" },
        onDelete: "CASCADE",
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      dueDate: { type: Sequelize.DATEONLY, allowNull: true },
      statut: {
        type: Sequelize.ENUM("EN_COURS", "ATTEINT", "NON_ATTEINT"),
        allowNull: false,
        defaultValue: "EN_COURS",
      },
      createdBy: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("skills", {
      idSkill: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      category: { type: Sequelize.STRING(100), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("employeeSkills", {
      idEmployeeSkill: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      idEmployeeProfile: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "employeeProfiles", key: "idEmployeeProfile" },
        onDelete: "CASCADE",
      },
      idSkill: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "skills", key: "idSkill" },
        onDelete: "CASCADE",
      },
      niveau: {
        type: Sequelize.ENUM("DEBUTANT", "INTERMEDIAIRE", "AVANCE", "EXPERT"),
        allowNull: false,
        defaultValue: "DEBUTANT",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("employeeSkills", ["idEmployeeProfile", "idSkill"], {
      unique: true,
      name: "employee_skills_unique",
    });

    await queryInterface.createTable("trainings", {
      idTraining: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      title: { type: Sequelize.STRING(255), allowNull: false },
      provider: { type: Sequelize.STRING(150), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("employeeTrainings", {
      idEmployeeTraining: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      idEmployeeProfile: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "employeeProfiles", key: "idEmployeeProfile" },
        onDelete: "CASCADE",
      },
      idTraining: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "trainings", key: "idTraining" },
        onDelete: "CASCADE",
      },
      statut: {
        type: Sequelize.ENUM("PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"),
        allowNull: false,
        defaultValue: "PLANIFIEE",
      },
      startDate: { type: Sequelize.DATEONLY, allowNull: true },
      endDate: { type: Sequelize.DATEONLY, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("employeeTrainings");
    await queryInterface.dropTable("trainings");
    await queryInterface.dropTable("employeeSkills");
    await queryInterface.dropTable("skills");
    await queryInterface.dropTable("objectives");
    await queryInterface.dropTable("evaluations");
  },
};
