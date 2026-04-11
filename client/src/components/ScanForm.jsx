import { useState } from "react";
import { motion } from "framer-motion";
import { FaSearch, FaSpinner } from "react-icons/fa";
import API from "../services/api";
import "./ScanForm.css";

function ScanForm({ setResult, setHistory }) {

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizeScanResult = (rawResult, fallbackMessage) => {
    const safe = rawResult && typeof rawResult === "object" ? rawResult : {};
    const safeSecurity = safe.security_analysis && typeof safe.security_analysis === "object"
      ? safe.security_analysis
      : {};

    return {
      ...safe,
      message: String(safe.message || fallbackMessage || ""),
      category: String(safe.category || "Safe"),
      risk_score: Number(safe.risk_score) || 0,
      confidence_percent: Number(safe.confidence_percent) || 0,
      risk_breakdown: safe.risk_breakdown && typeof safe.risk_breakdown === "object" ? safe.risk_breakdown : {},
      security_analysis: {
        keyword_flags: Array.isArray(safeSecurity.keyword_flags) ? safeSecurity.keyword_flags : [],
        url_analysis: safeSecurity.url_analysis && typeof safeSecurity.url_analysis === "object" ? safeSecurity.url_analysis : {},
        domain_age_days: typeof safeSecurity.domain_age_days === "number" ? safeSecurity.domain_age_days : null,
        flagged_by_google_safe_browsing: Boolean(safeSecurity.flagged_by_google_safe_browsing)
      }
    };
  };

  const handleScan = async () => {

    if (!message.trim()) {
      setError("Please enter a message or URL to scan");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await API.post("/scan", { message });
      const normalized = normalizeScanResult(res?.data?.data, message);
      setResult(normalized);
      
      // Clear the form
      setMessage("");
      
      // Refresh history
      if (setHistory) {
        const historyRes = await API.get("/history");
        setHistory(historyRes.data.data);
      }
    } catch (err) {
      const serverMessage = err?.response?.data?.error || err?.message;
      setError(serverMessage ? `Failed to scan: ${serverMessage}` : "Failed to scan message. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key !== "Enter" || loading) {
      return;
    }

    const isCtrlOrCmdEnter = e.ctrlKey || e.metaKey;
    const isPlainEnter = !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey;

    if (isCtrlOrCmdEnter || isPlainEnter) {
      e.preventDefault();
      handleScan();
    }
  };

  return (
    <motion.div
      className="scan-form-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="card scan-form-card">
        <div className="form-header">
          <FaSearch style={{ marginRight: "10px", color: "#00d4ff" }} />
          <h2>Scan Message or URL</h2>
        </div>

        <textarea
          placeholder="Paste a suspicious message or URL here... (Press Enter or Ctrl+Enter to scan)"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setError("");
          }}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="scan-textarea"
          rows="5"
        />

        <div className="keyboard-shortcut-hint">Enter or Ctrl+Enter to scan. Use Shift+Enter for a new line.</div>

        {error && (
          <motion.div
            className="error-message"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {error}
          </motion.div>
        )}

        {loading && (
          <motion.div
            className="scan-loading"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="scan-loading-row">
              <FaSpinner className="scan-loading-spinner" />
              <span>Analyzing message...</span>
            </div>
            <div className="scan-loading-bar">
              <div className="scan-loading-progress" />
            </div>
          </motion.div>
        )}

        <motion.button
          onClick={handleScan}
          disabled={loading || !message.trim()}
          className="scan-btn primary-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            <>
              <FaSpinner style={{ animation: "spin 1s linear infinite" }} />
              Scanning...
            </>
          ) : (
            <>
              <FaSearch />
              Scan Message
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

export default ScanForm;