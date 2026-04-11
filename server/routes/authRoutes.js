import express from "express";
import { register, login, logout } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../validation/schemas.js";
import { authMiddleware } from "../middleware/auth.js";

export const authRoutes = (secret, loginLimiter) => {

  const router = express.Router();
  const authMiddlewareInstance = authMiddleware(secret);

  // Register Route
  router.post(
    "/register",
    validate(registerSchema),
    async (req, res) => {
      try {
        await register(req, res);
      } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({
          success: false,
          message: "Registration failed"
        });
      }
    }
  );

  // Login Route
  router.post(
    "/login",
    loginLimiter,
    validate(loginSchema),
    async (req, res) => {
      try {
        await login(req, res, secret);
      } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({
          success: false,
          message: "Login failed"
        });
      }
    }
  );

  router.post("/logout", authMiddlewareInstance, logout);

  return router;

};