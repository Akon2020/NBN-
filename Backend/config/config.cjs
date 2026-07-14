require("dotenv").config({
  path: `.env.${process.env.NODE_ENV || "development"}.local`,
});

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  dialect: "mysql",
};

module.exports = {
  development: {
    ...base,
    database: process.env.DB_NAME,
  },
  test: {
    ...base,
    database: process.env.DB_NAME_TEST || "database_test",
  },
  production: {
    ...base,
    database: process.env.DB_NAME,
  },
};
