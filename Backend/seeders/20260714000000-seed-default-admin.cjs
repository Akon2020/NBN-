"use strict";
const bcrypt = require("bcryptjs");

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@nyumbaniexpress.com";

module.exports = {
  async up(queryInterface) {
    const defaultPassword = process.env.DEFAULT_PASSWD || "Changemoi@NBN2026";
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    await queryInterface.bulkInsert("users", [
      {
        fullName: "Administrateur NBN",
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: "admin",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("users", { email: ADMIN_EMAIL });
  },
};
