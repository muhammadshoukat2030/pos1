import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import session from "express-session";
import compression from "compression";

// Models
import StoreSettings from "./models/StoreSettings.js";

// REST JSON API Routes
import authApi from "./routes/api/authApi.js";
import dashboardApi from "./routes/api/dashboardApi.js";
import productsApi from "./routes/api/productsApi.js";
import salesApi from "./routes/api/salesApi.js";
import ledgerApi from "./routes/api/ledgerApi.js";
import reportsApi from "./routes/api/reportsApi.js";
import agentsApi from "./routes/api/agentsApi.js";
import dynamicApi from "./routes/api/dynamicApi.js";
import settingsApi from "./routes/api/settingsApi.js";
import branchesApi from "./routes/api/branchesApi.js";
import batchesApi from "./routes/api/batchesApi.js";
import brandsApi from "./routes/api/brandsApi.js";
import categoriesApi from "./routes/api/categoriesApi.js";

// Automated Services
import { initBackupScheduler } from "./services/backupScheduler.js";

// Load .env & Connect Database
dotenv.config();
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// =======================================================
// 🛡 SECURITY LAYER 1 → Hide Express
// =======================================================
app.disable("x-powered-by");

// =======================================================
// 🛡 SECURITY LAYER 2 → Helmet Security Headers
// =======================================================
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for flexible SPA font/image assets
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

// =======================================================
// 🛡 SECURITY LAYER 3 → CORS (Universal credentials & origins)
// =======================================================
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  })
);

// =======================================================
// 🛡 SECURITY LAYER 4 → Trust proxy
// =======================================================
app.set("trust proxy", 1);

// =======================================================
// 🛡 SECURITY LAYER 5 → Parsers & Compression
// =======================================================
app.use(compression());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());

// =======================================================
// 🛡 SECURITY LAYER 6 → Static Uploads & Public Assets
// =======================================================
const uploadsDir = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use("/uploads", express.static(uploadsDir));
app.use("/images", express.static(path.join(__dirname, "public/images")));
app.use(express.static(path.join(__dirname, "public")));

// =======================================================
// 🛡 SESSION CONFIGURATION
// =======================================================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "universal_pos_secret_key_session_2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: false, // Allows both HTTP and HTTPS local development
      sameSite: "lax"
    }
  })
);

// =======================================================
// 🌐 GLOBAL STORE SETTINGS CACHE / ATTACH
// =======================================================
app.use(async (req, res, next) => {
  try {
    const settings = await StoreSettings.getSettings();
    req.storeSettings = settings;
  } catch (err) {
    req.storeSettings = null;
  }
  next();
});

// =======================================================
// 🚀 REST JSON API ROUTES (FOR REACT FRONTEND)
// =======================================================
app.use("/api/auth", authApi);
app.use("/api/dashboard", dashboardApi);
app.use("/api/products", productsApi);
app.use("/api/sales", salesApi);
app.use("/api/ledger", ledgerApi);
app.use("/api/reports", reportsApi);
app.use("/api/agents", agentsApi);
app.use("/api/dynamic", dynamicApi);
app.use("/api/settings", settingsApi);
app.use("/api/branches", branchesApi);
app.use("/api/batches", batchesApi);
app.use("/api/brands", brandsApi);
app.use("/api/categories", categoriesApi);

// =======================================================
// 🖥️ REACT SPA CLIENT SERVING (Production & Built Dist)
// =======================================================
const frontendDistPath = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// React SPA Client Fallback: Any non-API route serves index.html
app.use((req, res, next) => {
  if (
    req.method === "GET" &&
    !req.path.startsWith("/api") &&
    !req.path.startsWith("/uploads") &&
    !req.path.startsWith("/images")
  ) {
    const indexPath = path.join(__dirname, "../frontend/dist/index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  next();
});

// 404 Handler for API routes
app.use("/api/*splat", (req, res) => {
  res.status(404).json({ success: false, message: `API endpoint ${req.originalUrl} not found` });
});

// General Error Handler
app.use((err, req, res, next) => {
  console.error("❌ SERVER ERROR:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

// =======================================================
// 🚀 SERVER START (Listening on '0.0.0.0' for IPv4 + IPv6)
// =======================================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Universal POS & ERP Server running on http://127.0.0.1:${PORT} (0.0.0.0)`);
  initBackupScheduler();
});
