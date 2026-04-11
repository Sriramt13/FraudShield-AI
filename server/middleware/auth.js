import jwt from "jsonwebtoken";
import { markUserActive } from "../services/realtimeMetrics.js";

export const authMiddleware = (secret) => (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secret);

    req.user = decoded;
    markUserActive(decoded.id);
    next();

  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required"
    });
  }
  next();
};