import express from "express";
import { scanMessage, getHistory } from "../controllers/scanController.js";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { scanSchema } from "../validation/schemas.js";

export const scanRoutes = (secret, mlUrl) => {
  const router = express.Router();
  const authMiddlewareInstance = authMiddleware(secret);

  router.post(
    "/scan",
    authMiddlewareInstance,
    validate(scanSchema),
    (req, res) => scanMessage(req, res, mlUrl)
  );

  router.get("/history", authMiddlewareInstance, getHistory);

  return router;
};