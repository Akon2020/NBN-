"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("properties", [
      {
        category: "RENT",
        propertyType: "APPARTEMENT",
        quartier: "Ibanda",
        avenue: "Avenue du Lac",
        bedrooms: 2,
        livingRooms: 1,
        toilets: 1,
        kitchens: 1,
        price: 500,
        latitude: -2.509,
        longitude: 28.856,
        createdBy: 1,
        createdAt: new Date(),
      },
      {
        category: "SALE",
        propertyType: "MAISON",
        quartier: "Bagira",
        avenue: "Route Nationale",
        bedrooms: 4,
        livingRooms: 2,
        toilets: 2,
        kitchens: 1,
        price: 45000,
        margin: 5000,
        latitude: -2.478,
        longitude: 28.889,
        createdBy: 2,
        createdAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("properties", null, {});
  },
};
