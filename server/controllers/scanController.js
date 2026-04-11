import Scan from "../models/Scan.js";
import { callMLService } from "../services/mlService.js";
import { logger } from "../utils/logger.js";
import { recordScanRequest } from "../services/realtimeMetrics.js";

export const scanMessage = async (req, res, mlUrl) => {
  try {
    const { message } = req.body;

    const result = await callMLService(message, mlUrl);

    await Scan.create({
      userId: req.user.id,
      message,
      ...result
    });

    recordScanRequest({ success: true });

    res.json({ success: true, data: { ...result, message } });

  } catch (error) {
    recordScanRequest({ success: false });
    logger.error("Scan Error", { error: error.message });
    res.status(500).json({ success: false, error: "ML service unavailable" });
  }
};

export const getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const scans = await Scan.find({ userId: req.user.id })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ scannedAt: -1 });

    const total = await Scan.countDocuments({ userId: req.user.id });
    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: scans,
      pagination: { page: parseInt(page), limit: parseInt(limit), pages, total }
    });

  } catch (error) {
    logger.error("History Error", { error: error.message });
    res.status(500).json({ success: false, error: "Failed to fetch history" });
  }
};