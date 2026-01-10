"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("activityLogs", [
      {
        idUser: 1,
        action: "CREATE_PROPERTY",
        entity: "Property",
        entityId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("activityLogs", null, {});
  },
};
