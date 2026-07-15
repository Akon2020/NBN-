import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import logger from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import errorMiddleware, { errorLogs } from "./middlewares/error.middleware.js";
import { setupSwagger } from "./swagger.js";
import { NODE_ENV } from "./config/env.js";
import userRouter from "./routes/user.route.js";
import authRouter from "./routes/auth.route.js";
import accessGrantRouter from "./routes/accessGrant.route.js";
import permissionRouter from "./routes/permission.route.js";
import propertyRouter from "./routes/property.route.js";
import favoriteRouter from "./routes/favorite.route.js";
import proposalRouter from "./routes/proposal.route.js";
import clientRouter from "./routes/client.route.js";
import bailleurRouter from "./routes/bailleur.route.js";
import matchingRouter from "./routes/matching.route.js";
import commissionnaireRouter from "./routes/commissionnaire.route.js";
import missionRouter from "./routes/mission.route.js";

const app = express();

app.use(helmet());
app.use(logger("dev"));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true, limit: "1024mb" }));
app.use(bodyParser.json({ limit: "1024mb" }));
const PROD_ORIGINS = ["https://nbn-plus.vercel.app"];
// Expo Metro choisit un port différent à chaque redémarrage si le port
// par défaut (8081) est occupé — whitelister chaque port un par un n'est
// pas praticable en développement. N'importe quel localhost/127.0.0.1 est
// donc accepté en dev uniquement ; en production, seule la liste explicite
// ci-dessus est autorisée.
const isDevOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || PROD_ORIGINS.includes(origin)) return callback(null, true);
      if (NODE_ENV !== "production" && isDevOrigin(origin)) return callback(null, true);
      return callback(new Error("Origine non autorisée par la politique CORS."));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

setupSwagger(app);

app.get("/", (req, res) => {
  return res.status(200).json({
    message: `Checking NBN API\n=> Passed successfully at ${new Date()}`,
  });
});

app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);
app.use("/api/access-grants", accessGrantRouter);
app.use("/api/permissions", permissionRouter);
app.use("/api/properties", propertyRouter);
app.use("/api/favorites", favoriteRouter);
app.use("/api/proposals", proposalRouter);
app.use("/api/clients", clientRouter);
app.use("/api/bailleurs", bailleurRouter);
app.use("/api/matchings", matchingRouter);
app.use("/api/commissionnaires", commissionnaireRouter);
app.use("/api/missions", missionRouter);

app.get("/error", errorLogs);
app.use(errorMiddleware);

export default app;
