import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
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
const port = Number(process.env.PORT ?? 5000);
const MONGO_URI = process.env.MONGODB_URI;
const DB_RETRY_DELAY_MS = 10000;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "https://life-os-kohl-psi.vercel.app";
const IS_PRODUCTION_LIKE = process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET && IS_PRODUCTION_LIKE) {
  throw new Error("SESSION_SECRET is missing. Set it in your Render environment.");
}

let isMongoConnected = false;

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

app.use((req, _res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    db: isMongoConnected ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/columns", columnRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/user", requireAuth, userRoutes);
app.use(notFoundHandler);
app.use(globalErrorHandler);

const printRegisteredRoutes = () => {
  const groups = [
    { base: "/api/auth", router: authRoutes },
    { base: "/api/tasks", router: taskRoutes },
    { base: "/api/columns", router: columnRoutes },
    { base: "/api/schedules", router: scheduleRoutes },
    { base: "/api/user", router: userRoutes },
  ];

  console.log("[ROUTES] Registered routes:");
  console.log("[ROUTE] GET /api/health");

  groups.forEach(({ base, router }) => {
    (router.stack || []).forEach((layer) => {
      if (!layer.route?.path) {
        return;
      }

      const methods = Object.keys(layer.route.methods || {})
        .map((method) => method.toUpperCase())
        .join(",");

      console.log(`[ROUTE] ${methods} ${base}${layer.route.path}`);
    });
  });
};

const connectMongoWithRetry = async () => {
  if (!MONGO_URI) {
    console.error("❌ MONGODB_URI is missing. Add it in backend/.env");
    return;
  }

  try {
    // Try SRV connection first (standard MongoDB Atlas format)
    await mongoose.connect(MONGO_URI, { 
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      retryWrites: true,
    });
    isMongoConnected = true;
    console.log("✅ MongoDB Connected (SRV)");
  } catch (error) {
    console.error("❌ DB Error (SRV failed):", error.message);
    
    // Try fallback: convert SRV to direct connection
    if (MONGO_URI.includes("mongodb://")) {
      console.log("⚠️  Attempting fallback direct connection...");
      try {
        const fallbackUri = MONGO_URI.replace("mongodb://", "mongodb://").replace("?", "&");
        await mongoose.connect(fallbackUri, { 
          serverSelectionTimeoutMS: 30000,
          connectTimeoutMS: 30000,
        });
        isMongoConnected = true;
        console.log("✅ MongoDB Connected (Fallback Direct)");
        return;
      } catch (fallbackError) {
        console.error("❌ Fallback also failed:", fallbackError.message);
      }
    }

    isMongoConnected = false;
    console.log(`Retrying MongoDB connection in ${DB_RETRY_DELAY_MS / 1000}s...`);
    setTimeout(() => {
      void connectMongoWithRetry();
    }, DB_RETRY_DELAY_MS);
  }
};

const startServer = async () => {
  app.listen(port, () => {
    console.log(`🚀 Server running on ${port}`);
    printRegisteredRoutes();
  });

  console.log("Using Mongo URI:", process.env.MONGODB_URI);
  await connectMongoWithRetry();
};

void startServer();
