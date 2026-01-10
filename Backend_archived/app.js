import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import logger from "morgan";
import { PORT, HOST_URL } from "./config/env.js";
import db from "./database/db.js";
import { syncModels } from "./models/index.model.js";
import errorMiddleware, { errorLogs } from "./middlewares/error.middleware.js";
import { setupSwagger } from "./swagger.js";
import userRouter from "./routes/user.route.js";
import authRouter from "./routes/auth.route.js";

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true, limit: "1024mb" }));
app.use(bodyParser.json({ limit: "1024mb" }));
app.use(
  cors({
    origin: true,
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

const port = PORT || 3000;
app.listen(port, "0.0.0.0", async (err) => {
  if (err) {
    console.log(`Error occurred: ${err}`);
  } else {
    try {
      await syncModels();
      console.log(`Server running at http://0.0.0.0:${port}/`);
      console.log(`Swagger Documentation at ${HOST_URL || `http://localhost:${port}`}/api-docs/`);
    } catch (error) {
      console.error("Error syncing models:", error);
    }
  }
});

export default app;
