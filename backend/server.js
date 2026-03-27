import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";
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
const DB_NAME = "lifeos";
const DB_RETRY_DELAY_MS = 10000;
const IS_PRODUCTION_LIKE = process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);
const SESSION_SECRET = process.env.SESSION_SECRET;
const ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];
const CLIENT_BUILD_PATH = path.join(__dirname, "client", "build");

if (!SESSION_SECRET && IS_PRODUCTION_LIKE) {
  throw new Error("SESSION_SECRET is missing. Set it in your Render environment.");
}

let isMongoConnected = false;

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
    name: "lifeos.sid",
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

app.use(express.static(CLIENT_BUILD_PATH));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(CLIENT_BUILD_PATH, "index.html"));
});

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
      dbName: DB_NAME,
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
          dbName: DB_NAME,
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
  console.log("Using Mongo URI:", process.env.MONGODB_URI);

  // Connect database first so session store is ready before accepting requests.
  await connectMongoWithRetry();

  app.listen(port, () => {
    console.log(`🚀 Server running on ${port}`);
    printRegisteredRoutes();
  });
};

void startServer();
