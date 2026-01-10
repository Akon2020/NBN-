"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("rentalProperties", [
      {
        idProperty: 1,
        guarantee: 1000,
        unit: "MONTH",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("rentalProperties", null, {});
  },
};
