import express from "express";
import {
  getGlobalStats,
  getActiveUsers,
  getSystemHealth,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getUserDetails,
  getSystemUsage
} from "../controllers/adminController.js";
import { authMiddleware, requireAdmin } from "../middleware/auth.js";

export const adminRoutes = (secret) => {
  const router = express.Router();
  const authMiddlewareInstance = authMiddleware(secret);

  // Apply auth middleware to all admin routes
  router.use(authMiddlewareInstance);
  router.use(requireAdmin);

  // Statistics
  router.get("/stats", getGlobalStats);
  router.get("/active-users", getActiveUsers);
  router.get("/health", getSystemHealth);

  // Users Management
  router.get("/users", getAllUsers);
  router.get("/users/:userId", getUserDetails);
  router.put("/users/:userId/role", updateUserRole);
  router.patch("/users/:userId/status", updateUserStatus);
  router.delete("/users/:userId", deleteUser);

  // System Usage
  router.get("/usage", getSystemUsage);

  return router;
};
