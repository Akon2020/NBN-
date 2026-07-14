import { config } from "dotenv";

config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

export const {
  PORT,
  NODE_ENV,
  URL_ORIGIN,
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_WEB_DAYS,
  REFRESH_TOKEN_EXPIRES_MOBILE_DAYS,
  EMAIL,
  EMAIL_PASSWORD,
  HOST_URL,
  FRONT_URL,
  DEFAULT_PASSWD,
} = process.env;
