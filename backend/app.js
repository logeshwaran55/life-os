import express from "express";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import taskRoutes from "./routes/taskRoutes.js";
import columnRoutes from "./routes/columnRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { requireAuth } from "./middleware/authMiddleware.js";
import { globalErrorHandler, notFoundHandler } from "./middleware/errorMiddleware.js";
import { configurePassport } from "./config/passport.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const IS_PRODUCTION_LIKE = process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);
const SESSION_SECRET = process.env.SESSION_SECRET;
const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = "lifeos";
const ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];
const CLIENT_BUILD_PATH = path.join(__dirname, "client", "build");

if (!SESSION_SECRET && IS_PRODUCTION_LIKE) {
  throw new Error("SESSION_SECRET is missing. Set it in your Render environment.");
}

app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin and local dev origins; production same-origin does not send Origin.
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
configurePassport();
app.use(
  session({
    name: "connect.sid",
    secret: SESSION_SECRET || "lifeos_session_secret_change_me",
    store: MONGO_URI
      ? MongoStore.create({
          mongoUrl: MONGO_URI,
          dbName: DB_NAME,
          collectionName: "sessions",
          ttl: 14 * 24 * 60 * 60,
        })
      : undefined,
    proxy: IS_PRODUCTION_LIKE,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: IS_PRODUCTION_LIKE,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/columns", columnRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/user", requireAuth, userRoutes);

app.use(express.static(CLIENT_BUILD_PATH));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(CLIENT_BUILD_PATH, "index.html"));
});

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
