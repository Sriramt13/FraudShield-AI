import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

export const connectDB = async (uri) => {
  try {
    await mongoose.connect(uri);
    logger.info("MongoDB Connected");
  } catch (error) {
    logger.error("DB Connection Error", { error: error.message });
    process.exit(1);
  }
};