import { Sequelize } from "sequelize";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "Please define DATABASE_URL in environment variables"
  );
}

const db = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  dialectOptions: {
    ssl: false,
  },
});

(async () => {
  try {
    await db.authenticate();
    console.log(
      `Database connected successfully in ${process.env.NODE_ENV || 'development'} mode`
    );
  } catch (err) {
    console.error("Database connection error:", err.message);
  }
})();

export default db;
