"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("favorites", [
      {
        idUser: 2,
        idProperty: 1,
        madeAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        idUser: 3,
        idProperty: 2,
        madeAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("favorites", null, {});
  },
};
