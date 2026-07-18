"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // GOAL 15 — la timeline générique (GOAL 3, étendue à MISSION en GOAL 14)
    // couvrait déjà quatre entités métier ; les tâches en avaient besoin
    // aussi (création, changement de statut, réassignation, commentaires).
    await queryInterface.changeColumn("timelineEvents", "entityType", {
      type: Sequelize.ENUM("PROPERTY", "CLIENT", "COMMISSIONNAIRE", "BAILLEUR", "MISSION", "TASK"),
      allowNull: false,
    });

    // GOAL 15 — fil de discussion simple par tâche, jamais éditable après
    // publication (append-only, cohérent avec le reste du système) ;
    // seule la suppression par l'auteur ou un titulaire de tasks:manage
    // est permise (modération), pas d'édition silencieuse.
    await queryInterface.createTable("taskComments", {
      idTaskComment: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      idTask: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "tasks", key: "idTask" },
        onDelete: "CASCADE",
      },
      authorId: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("taskComments", ["idTask", "createdAt"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("taskComments");
    await queryInterface.changeColumn("timelineEvents", "entityType", {
      type: Sequelize.ENUM("PROPERTY", "CLIENT", "COMMISSIONNAIRE", "BAILLEUR", "MISSION"),
      allowNull: false,
    });
  },
};
