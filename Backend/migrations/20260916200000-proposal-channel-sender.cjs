"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Une proposition envoyée depuis le panier : par quel canal, et par qui.
    await queryInterface.addColumn("proposals", "channel", {
      type: Sequelize.ENUM("WHATSAPP", "EMAIL", "AUTRE"),
      allowNull: true,
    });
    await queryInterface.addColumn("proposals", "sentBy", {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: { model: "users", key: "idUser" },
    });
    // Pas d'index composite (idClient, sentAt) : MySQL le rattache à la clé
    // étrangère idClient et refuse ensuite de le supprimer au rollback. L'index
    // de la clé étrangère suffit au volume de propositions par client.
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("proposals", "sentBy");
    await queryInterface.removeColumn("proposals", "channel");
  },
};
