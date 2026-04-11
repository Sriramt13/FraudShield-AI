import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { logger } from "../utils/logger.js";

export const ensureDefaultAdmin = async (env) => {
  const adminEmail = (env.ADMIN_EMAIL || "admin@fraudshield.com").trim().toLowerCase();
  const adminPassword = env.ADMIN_PASSWORD || "Admin@12345";
  const adminName = (env.ADMIN_NAME || "System Admin").trim();
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const existingAdmin = await User.findOne({ email: adminEmail });

  if (existingAdmin) {
    existingAdmin.name = adminName;
    existingAdmin.password = hashedPassword;

    if (existingAdmin.role !== "admin") {
      existingAdmin.role = "admin";
      logger.info("Updated existing account to admin role and synced credentials", { email: adminEmail });
    } else {
      logger.info("Synced existing admin credentials from environment", { email: adminEmail });
    }

    await existingAdmin.save();
    return;
  }

  await User.create({
    name: adminName,
    email: adminEmail,
    password: hashedPassword,
    role: "admin"
  });

  logger.info("Default admin account ensured", { email: adminEmail });
};
