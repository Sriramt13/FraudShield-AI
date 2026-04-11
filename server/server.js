import dotenv from "dotenv";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { logger } from "./utils/logger.js";
import { ensureDefaultAdmin } from "./services/adminSeeder.js";

dotenv.config();

const env = {
  JWT_SECRET: process.env.JWT_SECRET,
  ML_SERVICE_URL: process.env.ML_SERVICE_URL,
  MONGO_URI: process.env.MONGO_URI,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_NAME: process.env.ADMIN_NAME
};

await connectDB(env.MONGO_URI);
await ensureDefaultAdmin(env);

const app = createApp(env);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});