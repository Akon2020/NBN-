"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Lu / non lu propre à chaque membre de la boîte : un message ouvert par
    // un collègue reste non lu pour les autres.
    await queryInterface.createTable("inboundEmailReads", {
      idInboundEmail: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        references: { model: "inboundEmails", key: "idInboundEmail" },
        onDelete: "CASCADE",
      },
      idUser: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        references: { model: "users", key: "idUser" },
        onDelete: "CASCADE",
      },
      readAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("inboundEmailReads");
  },
};
