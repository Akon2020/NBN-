'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('users', [
      {
        fullName: 'Admin Principal',
        email: 'admin@nyumbani.com',
        password: '$2b$10$F0BnIHDFnISi5BAqtgicieBAelVA../zkEjKemhypsRORn9pSbv2e',
        role: 'admin',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        fullName: 'Agent Immobilier',
        email: 'agent@nyumbani.com',
        password: '$2b$10$F0BnIHDFnISi5BAqtgicieBAelVA../zkEjKemhypsRORn9pSbv2e',
        role: 'agent',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        fullName: 'Consultant Terrain',
        email: 'consultant@nyumbani.com',
        password: '$2b$10$F0BnIHDFnISi5BAqtgicieBAelVA../zkEjKemhypsRORn9pSbv2e',
        role: 'consultant',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', null, {});
  },
};
