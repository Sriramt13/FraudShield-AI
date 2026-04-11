import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { markUserActive, markUserInactive, recordActivity } from "../services/realtimeMetrics.js";

/* =========================
   REGISTER USER
========================= */

export const register = async (req, res) => {
  try {

    const { name, email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
      // Demo-friendly behavior: refresh credentials for existing normal user accounts.
      if (existingUser.role === "admin") {
        return res.status(400).json({
          success: false,
          message: "This email is reserved for admin login"
        });
      }

      existingUser.name = name.trim();
      existingUser.password = hashedPassword;
      await existingUser.save();

      return res.status(200).json({
        success: true,
        message: "Account updated. Please login with your new password"
      });
    }

    // Create new user
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "user"
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully"
    });

  } catch (error) {

    console.error("Register error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });

  }
};


/* =========================
   LOGIN USER
========================= */

export const login = async (req, res, secret) => {

  try {

    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      secret,
      {
        expiresIn: "1d"
      }
    );

    // Send response (IMPORTANT for frontend)
    markUserActive(user._id);
    recordActivity(`${user.name || user.email} logged in`, "auth");

    res.status(200).json({
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {

    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });

  }

};

export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user?.id).select("name email");
    markUserInactive(req.user?.id);
    recordActivity(`${user?.name || user?.email || "User"} logged out`, "auth");
    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed"
    });
  }
};