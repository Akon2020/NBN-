"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("proposals", [
      {
        idProperty: 1,
        message: "Client intéressé, contact WhatsApp envoyé",
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("proposals", null, {});
  },
};
