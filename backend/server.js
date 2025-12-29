import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import { initDatabase } from "./database.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import healthRoutes from "./routes/health.js";
import analysisRoutes from "./routes/analysis.js";
import reminderRoutes from "./routes/reminders.js";
import contactRoutes from "./routes/contacts.js";
import aiRoutes from "./routes/ai.js";
import alertRoutes from "./routes/alerts.js";

const app = express();
const PORT = process.env.PORT || 3000;

/* middleware */
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

/* root */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Health Tracker API Server",
    version: "1.0.0",
    endpoints: {
      healthCheck: "/api/health-check",
      auth: "/api/auth",
      user: "/api/user",
      health: "/api/health",
      analysis: "/api/analysis",
      reminders: "/api/reminders",
      contacts: "/api/contacts",
      ai: "/api/ai",
      alerts: "/api/alerts"
    }
  });
});

/* routes */
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/alerts", alertRoutes);

/* health check */
app.get("/api/health-check", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

/* init db + start */
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to initialize database:", err);
    process.exit(1);
  });
