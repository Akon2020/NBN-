"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("propertyPhones", [
      {
        idProperty: 1,
        phoneNumber: "+243970000001",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        idProperty: 1,
        phoneNumber: "+243970000002",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        idProperty: 2,
        phoneNumber: "+243970000003",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("propertyPhones", null, {});
  },
};
