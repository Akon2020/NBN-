import { config } from "dotenv";

config();

export const {
  PORT = 3000,
  NODE_ENV = "development",
  URL_ORIGIN,
  DATABASE_URL,
  JWT_SECRET,
  JWT_EXPIRES_IN = "7d",
  EMAIL,
  EMAIL_PASSWORD,
  HOST_URL,
  FRONT_URL,
  DEFAULT_PASSWD = "password123",
} = process.env;
