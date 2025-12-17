"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("propertyImages", [
      {
        idProperty: 1,
        image: "house1.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        idProperty: 1,
        image: "house2.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        idProperty: 2,
        image: "villa1.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("propertyImages", null, {});
  },
};
