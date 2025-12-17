"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("propertyScores", [
      {
        idScore: 1,
        idProperty: 1,
        score: 12,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        idScore: 2,
        idProperty: 2,
        score: 18,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("propertyScores", null, {});
  },
};
