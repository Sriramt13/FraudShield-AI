import User from "../models/User.js";
import Scan from "../models/Scan.js";
import { logger } from "../utils/logger.js";
import mongoose from "mongoose";
import axios from "axios";
import {
  getActiveUsersCount,
  getTotalScanRequests,
  getScanErrorRate,
  getScanRequestsTrend,
  getRecentActivity,
  recordActivity
} from "../services/realtimeMetrics.js";

const getDefaultAdminEmail = () => (process.env.ADMIN_EMAIL || "admin@fraudshield.com").trim().toLowerCase();
const isDefaultAdmin = (user) => String(user?.email || "").trim().toLowerCase() === getDefaultAdminEmail();

/* =========================
   GET GLOBAL STATISTICS
========================= */

export const getGlobalStats = async (req, res) => {
  try {
    const defaultAdminEmail = getDefaultAdminEmail();
    const managedUsersQuery = { email: { $ne: defaultAdminEmail } };
    const totalUsers = await User.countDocuments(managedUsersQuery);
    const totalScans = await Scan.countDocuments();
    const totalAdmins = await User.countDocuments({ role: "admin", email: { $ne: defaultAdminEmail } });

    // Risk category breakdown
    const riskBreakdown = await Scan.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          avgScore: { $avg: "$risk_score" }
        }
      }
    ]);

    // Scans in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentScans = await Scan.countDocuments({
      scannedAt: { $gte: sevenDaysAgo }
    });

    // Top phishing patterns
    const topKeywords = await Scan.aggregate([
      {
        $match: { category: { $in: ["Suspicious", "High Risk - Phishing"] } }
      },
      {
        $group: {
          _id: "$security_analysis.keyword_flags",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const activeUsers = getActiveUsersCount();
    const totalRequests = getTotalScanRequests();
    const errorRate = getScanErrorRate();
    const requestsTrend = getScanRequestsTrend();
    const recentActivity = getRecentActivity(5);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalScans,
        totalAdmins,
        activeUsers,
        totalRequests,
        errorRate,
        requestsTrend,
        recentActivity,
        recentScans,
        riskBreakdown,
        topKeywords,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    logger.error("Stats Error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics"
    });
  }
};

export const getActiveUsers = async (req, res) => {
  try {
    res.json({
      success: true,
      activeUsers: getActiveUsersCount(),
      lastUpdated: new Date()
    });
  } catch (error) {
    logger.error("Active Users Error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Failed to fetch active users"
    });
  }
};

export const getSystemHealth = async (req, res) => {
  try {
    const db = mongoose.connection.readyState === 1;
    const api = true;
    let ml = false;

    const mlUrl = String(process.env.ML_SERVICE_URL || "").replace(/\/$/, "");
    if (mlUrl) {
      try {
        const mlHealth = await axios.get(`${mlUrl}/health`, { timeout: 2500 });
        ml = mlHealth.status === 200 && Boolean(mlHealth.data?.status);
      } catch {
        ml = false;
      }
    }

    res.json({
      success: true,
      data: {
        api,
        db,
        ml,
        rateLimit: getScanErrorRate() >= 5 ? "high" : "moderate",
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    logger.error("System Health Error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Failed to fetch system health"
    });
  }
};

/* =========================
   GET ALL USERS (Paginated)
========================= */

export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, q = "" } = req.query;
    const skip = (page - 1) * limit;
    const search = String(q).trim();
    const defaultAdminEmail = getDefaultAdminEmail();

    const query = {
      email: { $ne: defaultAdminEmail },
      ...(search
        ? {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } }
            ]
          }
        : {})
    };

    const users = await User.find(query, "-password")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const usersWithFlags = users.map((user) => ({
      ...user.toObject(),
      isSystemAdmin: isDefaultAdmin(user)
    }));

    const total = await User.countDocuments(query);
    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: usersWithFlags,
      pagination: { page: parseInt(page), limit: parseInt(limit), pages, total }
    });
  } catch (error) {
    logger.error("Get Users Error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Failed to fetch users"
    });
  }
};

/* =========================
   UPDATE USER ROLE
========================= */

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (isDefaultAdmin(targetUser)) {
      return res.status(403).json({
        success: false,
        message: "Default admin role cannot be changed"
      });
    }

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role"
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    logger.info("User role updated", { userId, newRole: role });
    recordActivity(`Admin changed role for ${user.email} to ${role}`, "admin");

    res.json({
      success: true,
      message: "User role updated successfully",
      data: user
    });
  } catch (error) {
    logger.error("Update Role Error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Failed to update user role"
    });
  }
};

/* =========================
   UPDATE USER STATUS / FLAG
========================= */

export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, flagged, flagReason } = req.body;

    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (isDefaultAdmin(targetUser)) {
      return res.status(403).json({ success: false, message: "Default admin account cannot be suspended or flagged" });
    }

    const updates = {};

    if (status !== undefined) {
      if (!["active", "suspended"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status"
        });
      }

      if (userId === req.user.id && status === "suspended") {
        return res.status(403).json({
          success: false,
          message: "Cannot suspend your own account"
        });
      }

      updates.status = status;
    }

    if (flagged !== undefined) {
      updates.flagged = Boolean(flagged);
    }

    if (flagReason !== undefined) {
      updates.flagReason = String(flagReason).trim();
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    logger.info("User status updated", { userId, updates });
    recordActivity(`Admin updated status for ${user.email}`, "admin");

    res.json({
      success: true,
      message: "User status updated successfully",
      data: user
    });
  } catch (error) {
    logger.error("Update User Status Error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Failed to update user status"
    });
  }
};

/* =========================
   DELETE USER
========================= */

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent deleting yourself or last admin
    if (userId === req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete your own account"
      });
    }

    const adminCount = await User.countDocuments({ role: "admin" });
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (isDefaultAdmin(targetUser)) {
      return res.status(403).json({
        success: false,
        message: "Default admin account cannot be deleted"
      });
    }

    if (targetUser.role === "admin" && adminCount === 1) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete the last admin"
      });
    }

    await User.findByIdAndDelete(userId);
    await Scan.deleteMany({ userId });

    logger.info("User deleted", { userId });
    recordActivity(`Admin deleted user ${targetUser.email}`, "admin");

    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    logger.error("Delete User Error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Failed to delete user"
    });
  }
};

/* =========================
   GET USER DETAILS
========================= */

export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId, "-password");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const userScans = await Scan.find({ userId }).sort({ scannedAt: -1 });
    const riskStats = {
      total: userScans.length,
      safe: userScans.filter(s => s.category === "Safe").length,
      suspicious: userScans.filter(s => s.category === "Suspicious").length,
      highRisk: userScans.filter(s => s.category === "High Risk - Phishing").length
    };

    const averageRisk = userScans.length
      ? Math.round(userScans.reduce((sum, scan) => sum + (Number(scan.risk_score) || 0), 0) / userScans.length)
      : 0;

    const activitySummary = {
      lastScanAt: userScans[0]?.scannedAt || null,
      averageRisk,
      riskBehavior: riskStats.highRisk > 0
        ? "High-risk activity detected"
        : riskStats.suspicious > riskStats.safe
          ? "Elevated suspicious activity"
          : userScans.length > 0
            ? "Mostly safe activity"
            : "No scan activity yet"
    };

    res.json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          isSystemAdmin: isDefaultAdmin(user)
        },
        scans: userScans,
        riskStats,
        activitySummary
      }
    });
  } catch (error) {
    logger.error("Get User Details Error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Failed to fetch user details"
    });
  }
};

/* =========================
   SYSTEM USAGE METRICS
========================= */

export const getSystemUsage = async (req, res) => {
  try {
    // Hour-by-hour scan data for last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const hourlyUsage = await Scan.aggregate([
      {
        $match: { scannedAt: { $gte: last24Hours } }
      },
      {
        $group: {
          _id: { $hour: "$scannedAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Day-by-day scan data for last 30 days
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const dailyUsage = await Scan.aggregate([
      {
        $match: { scannedAt: { $gte: last30Days } }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$scannedAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        hourlyUsage,
        dailyUsage,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    logger.error("System Usage Error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Failed to fetch system usage"
    });
  }
};
