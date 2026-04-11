import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { authRoutes } from "./routes/authRoutes.js";
import { scanRoutes } from "./routes/scanRoutes.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { authMiddleware } from "./middleware/auth.js";
import { markUserActive } from "./services/realtimeMetrics.js";

export const createApp = (env) => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many login attempts. Please wait a minute and try again."
    }
  });

  app.use("/api/auth", authRoutes(env.JWT_SECRET, loginLimiter));
  app.use("/api", scanRoutes(env.JWT_SECRET, env.ML_SERVICE_URL));

  const authMiddlewareInstance = authMiddleware(env.JWT_SECRET);
  app.post("/api/heartbeat", authMiddlewareInstance, (req, res) => {
    markUserActive(req.user?.id);
    res.json({ success: true, heartbeatAt: new Date() });
  });

  app.use("/api/admin", adminRoutes(env.JWT_SECRET));

  return app;
};