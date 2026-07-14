import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import logger from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import errorMiddleware, { errorLogs } from "./middlewares/error.middleware.js";
import { setupSwagger } from "./swagger.js";
import userRouter from "./routes/user.route.js";
import authRouter from "./routes/auth.route.js";

const app = express();

app.use(helmet());
app.use(logger("dev"));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true, limit: "1024mb" }));
app.use(bodyParser.json({ limit: "1024mb" }));
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5500",
      "https://nbn-plus.vercel.app",
    ],
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

app.get("/error", errorLogs);
app.use(errorMiddleware);

export default app;
