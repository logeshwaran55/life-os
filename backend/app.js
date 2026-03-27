import express from "express";
import cors from "cors";
import session from "express-session";
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
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "https://life-os-kohl-psi.vercel.app";
const IS_PRODUCTION_LIKE = process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET && IS_PRODUCTION_LIKE) {
  throw new Error("SESSION_SECRET is missing. Set it in your Render environment.");
}

app.use(
  cors({
    origin: FRONTEND_BASE_URL,
    credentials: true,
  })
);
app.use(express.json());
configurePassport();
app.set("trust proxy", 1);
app.use(
  session({
    secret: SESSION_SECRET || "lifeos_session_secret_change_me",
    proxy: IS_PRODUCTION_LIKE,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: IS_PRODUCTION_LIKE ? "none" : "lax",
      secure: IS_PRODUCTION_LIKE,
      maxAge: 24 * 60 * 60 * 1000,
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
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
