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
import currencyRouter from "./routes/currency.route.js";
import caisseRouter from "./routes/caisse.route.js";
import exchangeRateRouter from "./routes/exchangeRate.route.js";
import requisitionRouter from "./routes/requisition.route.js";
import paymentRouter from "./routes/payment.route.js";
import commissionRouter from "./routes/commission.route.js";
import taskRouter from "./routes/task.route.js";
import notificationRouter from "./routes/notification.route.js";
import alertRouter from "./routes/alert.route.js";
import reminderRouter from "./routes/reminder.route.js";
import calendarRouter from "./routes/calendar.route.js";
import reportRouter from "./routes/report.route.js";
import hrRouter from "./routes/hr.route.js";
import dashboardRouter from "./routes/dashboard.route.js";
import timelineRouter from "./routes/timeline.route.js";
import { registerEventListeners } from "./shared/eventListeners.js";
import { registerRealtimeListeners } from "./shared/socketGateway.js";

// BACK-G17/G18 — enregistré ici (pas server.js) pour que les tests qui
// importent `app.js` directement (supertest, jamais via un vrai
// `listen()`) exercent aussi la conséquence réelle des événements
// métier, pas seulement la route HTTP isolée. `registerRealtimeListeners`
// est sans effet tant que `initSocketGateway` (server.js uniquement) n'a
// pas initialisé `io` — les émissions restent des no-op silencieux.
registerEventListeners();
registerRealtimeListeners();

const app = express();

app.use(helmet());
app.use(logger("dev"));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true, limit: "1024mb" }));
app.use(bodyParser.json({ limit: "1024mb" }));
const PROD_ORIGINS = ["https://nbn-plus.vercel.app"];
// Expo Metro choisit un port différent à chaque redémarrage si le port par
// défaut (8081) est occupé — whitelister chaque port un par un n'est pas
// praticable en développement. N'importe quel localhost/127.0.0.1 est donc
// accepté en dev, ainsi que les plages LAN privées (192.168.x.x, 10.x.x.x,
// 172.16-31.x.x) : un appareil physique testé via Expo Go sur le même
// Wi-Fi que la machine de dev envoie un Origin basé sur l'IP LAN de Metro,
// jamais localhost. En production, seule la liste explicite ci-dessus est
// autorisée.
const isDevOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ||
  /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):\d+$/.test(
    origin
  );

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

// SEC-G06 (complément) — les fichiers uploadés (multer, `file.path` =
// "uploads/images/xxx.jpg") n'étaient jamais servis statiquement : la
// route existait en théorie via PropertyImage.image mais aucune requête
// HTTP ne pouvait jamais les atteindre. `Cross-Origin-Resource-Policy`
// explicitement relâché ici (contrairement au reste de l'API) : Frontend
// et Backend tournent sur des origines différentes en dev, et
// `helmet()` pose `same-origin` par défaut, ce qui bloquerait le
// chargement de ces images par <Image> / <img> côté Frontend sinon.
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(process.cwd(), "uploads"))
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
app.use("/api/currencies", currencyRouter);
app.use("/api/caisses", caisseRouter);
app.use("/api/exchange-rates", exchangeRateRouter);
app.use("/api/requisitions", requisitionRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/commissions", commissionRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/alerts", alertRouter);
app.use("/api/reminders", reminderRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/reports", reportRouter);
app.use("/api/hr", hrRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/timeline", timelineRouter);

app.get("/error", errorLogs);
app.use(errorMiddleware);

export default app;
