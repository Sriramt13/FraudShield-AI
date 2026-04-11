import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaShieldAlt, FaSignOutAlt, FaHistory, FaExclamationTriangle } from "react-icons/fa";
import jsPDF from "jspdf";
import API from "../services/api";

import ScanForm from "../components/ScanForm";
import RiskMeter from "../components/RiskMeter";
import HistoryCard from "../components/HistoryCard";

import "./Dashboard.css";

function Dashboard() {

  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [userName, setUserName] = useState("User");
  const [selectedScanId, setSelectedScanId] = useState(null);
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState("all");
  const [historyDateFilter, setHistoryDateFilter] = useState("");
  const [toast, setToast] = useState(null);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  const logout = () => {

    API.post("/auth/logout").catch(() => null);

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/";

  };

  useEffect(() => {

    const storedUser = JSON.parse(sessionStorage.getItem("user") || "null");
    if (storedUser?.name) {
      setUserName(storedUser.name);
    }

    loadHistory();

  }, []);

  useEffect(() => {
    const sendHeartbeat = () => {
      API.post("/heartbeat").catch(() => null);
    };

    sendHeartbeat();
    const heartbeatTimer = setInterval(sendHeartbeat, 5000);

    return () => clearInterval(heartbeatTimer);
  }, []);

  useEffect(() => {
    if (!result) return;

    setShowFullAnalysis(false);

    const riskInfo = getRiskLevelInfo(result.category, result.risk_score);
    const message = riskInfo.label === "HIGH"
      ? "High Risk Detected!"
      : riskInfo.label === "SUSPICIOUS"
        ? "Suspicious content found"
        : "Safe link detected";

    setToast({ message, tone: riskInfo.tone });
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [result]);

  const loadHistory = async () => {

    try {

      const res = await API.get("/history");

      setHistory(res.data.data);

    } catch {

      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      window.location.href="/login";

    }

  };

  const categoryClass = (category = "") =>
    category.toLowerCase().includes("high")
      ? "high-risk"
      : category.toLowerCase().replace(/\s+/g, "-");

  const getRiskLevelInfo = (category = "", score = 0) => {
    const lower = category.toLowerCase();

    if (lower.includes("high") || Number(score) >= 60) {
      return { label: "HIGH", tone: "danger", icon: "🔴", recommendation: "❌ Do NOT click this link" };
    }

    if (lower.includes("suspicious") || Number(score) >= 30) {
      return { label: "SUSPICIOUS", tone: "warning", icon: "🟠", recommendation: "⚠️ Verify the source before opening" };
    }

    return { label: "SAFE", tone: "safe", icon: "🟢", recommendation: "✅ Looks low risk, but still verify the sender" };
  };

  const getDetectedIssues = (scanResult) => {
    if (!scanResult) return [];

    const analysis = scanResult.security_analysis || {};
    const urlAnalysis = analysis.url_analysis || {};
    const keywordFlags = analysis.keyword_flags || [];
    const breakdown = scanResult.risk_breakdown || {};
    const issues = [];

    keywordFlags.forEach((keyword) => {
      issues.push({ label: `Suspicious keyword: "${keyword}"`, impact: breakdown.keyword_score ? Math.max(1, Math.round(breakdown.keyword_score / Math.max(keywordFlags.length, 1))) : 0 });
    });

    if (urlAnalysis.suspicious_tld) {
      issues.push({ label: "Domain mismatch / suspicious TLD", impact: breakdown.url_structure_score || 0 });
    }

    if (urlAnalysis.url_shortener) {
      issues.push({ label: "Shortened URL detected", impact: breakdown.url_structure_score || 0 });
    }

    if (urlAnalysis.ip_based) {
      issues.push({ label: "IP-based URL detection", impact: breakdown.url_structure_score || 0 });
    }

    if (urlAnalysis.missing_https) {
      issues.push({ label: "HTTPS missing", impact: breakdown.url_structure_score || 0 });
    }

    if (urlAnalysis.multiple_subdomains) {
      issues.push({ label: "Multiple subdomains detected", impact: breakdown.url_structure_score || 0 });
    }

    if (analysis.domain_age_days !== null && analysis.domain_age_days !== undefined) {
      const ageLabel = analysis.domain_age_days < 7 ? `Domain age: ${analysis.domain_age_days} days` : `Domain age: ${analysis.domain_age_days} days`;
      issues.push({ label: ageLabel, impact: breakdown.domain_age_score || 0 });
    }

    if (analysis.flagged_by_google_safe_browsing) {
      issues.push({ label: "Google Safe Browsing reputation hit", impact: breakdown.reputation_score || 0 });
    }

    if (!issues.length) {
      issues.push({ label: "No major threats detected", impact: 0 });

      if ((breakdown.url_structure_score || 0) > 0) {
        issues.push({ label: "Minor URL anomaly detected", impact: breakdown.url_structure_score || 0 });
      } else if ((breakdown.ml_score || 0) > 0) {
        issues.push({ label: "Low-risk ML signal detected", impact: breakdown.ml_score || 0 });
      }
    }

    return issues;
  };

  const getDetectionSources = (scanResult) => {
    if (!scanResult) return [];

    const breakdown = scanResult.risk_breakdown || {};
    const analysis = scanResult.security_analysis || {};
    const urlAnalysis = analysis.url_analysis || {};

    return [
      {
        label: "ML Model",
        value: breakdown.ml_score ? `+${Math.round(breakdown.ml_score)}%` : "Clean",
        tone: breakdown.ml_score ? "danger" : "safe"
      },
      {
        label: "Google Safe Browsing",
        value: analysis.flagged_by_google_safe_browsing ? `+${Math.round(breakdown.reputation_score || 30)}%` : "Clean",
        tone: analysis.flagged_by_google_safe_browsing ? "danger" : "safe"
      },
      {
        label: "URL Heuristics",
        value: urlAnalysis.suspicious_tld || urlAnalysis.url_shortener || urlAnalysis.ip_based || urlAnalysis.missing_https || urlAnalysis.multiple_subdomains
          ? `+${Math.round(breakdown.url_structure_score || 0)}%`
          : "Normal",
        tone: urlAnalysis.suspicious_tld || urlAnalysis.url_shortener || urlAnalysis.ip_based || urlAnalysis.missing_https || urlAnalysis.multiple_subdomains ? "warning" : "safe"
      }
    ];
  };

  const getRiskTimeline = (scanResult) => {
    if (!scanResult) return [];

    const breakdown = scanResult.risk_breakdown || {};
    const analysis = scanResult.security_analysis || {};
    const urlAnalysis = analysis.url_analysis || {};
    const steps = [
      { label: "Keyword detection", value: breakdown.keyword_score || 0, tone: (breakdown.keyword_score || 0) > 0 ? "warning" : "safe" },
      { label: "URL anomaly", value: breakdown.url_structure_score || 0, tone: (breakdown.url_structure_score || 0) > 0 ? "warning" : "safe" },
      { label: "Domain risk", value: (breakdown.domain_age_score || 0) + (breakdown.reputation_score || 0), tone: ((breakdown.domain_age_score || 0) + (breakdown.reputation_score || 0)) > 0 ? "danger" : "safe" },
      { label: "Final score", value: Math.round(scanResult.risk_score || 0), tone: getRiskLevelInfo(scanResult.category, scanResult.risk_score).tone }
    ];

    if (urlAnalysis.ip_based) {
      steps.splice(2, 0, { label: "IP-based URL", value: breakdown.url_structure_score || 0, tone: "danger" });
    }

    return steps;
  };

  const getTrustScore = (riskScore = 0) => Math.max(0, 100 - Math.min(100, Math.max(0, Number(riskScore) || 0)));

  const getAnalysisItems = () => getDetectedIssues(result).map((issue) => issue.label);

  const getFilteredHistory = () => (Array.isArray(history) ? history : []).filter((scan) => {
    if (!scan || typeof scan !== "object") {
      return false;
    }

    const category = String(scan.category || "").toLowerCase();
    const matchesCategory = historyCategoryFilter === "all"
      || (historyCategoryFilter === "safe" && category.includes("safe"))
      || (historyCategoryFilter === "suspicious" && category.includes("suspicious"))
      || (historyCategoryFilter === "high" && category.includes("high"));

    let scanDateKey = "";
    if (scan.scannedAt) {
      const parsedDate = new Date(scan.scannedAt);
      if (!Number.isNaN(parsedDate.getTime())) {
        scanDateKey = parsedDate.toISOString().slice(0, 10);
      }
    }

    const matchesDate = !historyDateFilter || scanDateKey === historyDateFilter;

    return matchesCategory && matchesDate;
  });

  const getDomainDisplay = (scanResult) => {
    const analysis = scanResult?.security_analysis || {};
    const url = scanResult?.url_found || "";
    const urlAnalysis = analysis.url_analysis || {};

    let domain = "No URL detected";
    try {
      if (url) {
        domain = new URL(url).hostname || url;
      }
    } catch {
      domain = url || "No URL detected";
    }

    return {
      domain,
      https: urlAnalysis.missing_https ? "No" : "Yes",
      domainAge: analysis.domain_age_days,
      ipBased: urlAnalysis.ip_based,
      clickable: Boolean(url)
    };
  };

  const getResultTitle = (category = "") => {
    const lower = category.toLowerCase();
    if (lower.includes("high")) return "Phishing Link";
    if (lower.includes("suspicious")) return "Suspicious Link";
    return "Safe Link";
  };

  const getDisplayScoreInfo = (category = "", riskScore = 0) => {
    const boundedRisk = Math.min(100, Math.max(0, Number(riskScore) || 0));
    const lower = category.toLowerCase();

    if (lower.includes("safe")) {
      return { label: "Safety Score", value: 100 - boundedRisk };
    }

    return { label: "Risk Score", value: boundedRisk };
  };

  const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const formatContribution = (value) => {
    const numericValue = Number(value) || 0;
    return `${numericValue >= 0 ? "+" : ""}${Math.round(numericValue)}%`;
  };

  const getHighlightedMessage = (message = "", keywords = []) => {
    if (!message) return null;

    const uniqueKeywords = [...new Set((keywords || []).filter(Boolean))]
      .sort((a, b) => b.length - a.length);

    if (!uniqueKeywords.length) {
      return <span>{message}</span>;
    }

    const pattern = new RegExp(`(${uniqueKeywords.map(escapeRegExp).join("|")})`, "ig");
    const parts = message.split(pattern);

    return parts.map((part, index) => {
      if (!part) return null;
      if (uniqueKeywords.some((keyword) => keyword.toLowerCase() === part.toLowerCase())) {
        return (
          <span key={`${part}-${index}`} className="keyword-highlight">
            {part}
          </span>
        );
      }

      return <span key={`${part}-${index}`}>{part}</span>;
    });
  };

  const getRiskContributions = (scanResult) => {
    const breakdown = scanResult?.risk_breakdown || {};
    const keywordFlags = scanResult?.security_analysis?.keyword_flags || [];
    const keywordScore = Number(breakdown.keyword_score) || 0;
    const keywordContribution = keywordFlags.length ? keywordScore / keywordFlags.length : 0;

    const contributions = [];

    if (scanResult?.security_analysis?.flagged_by_google_safe_browsing) {
      contributions.push({ label: "Safe Browsing reputation", value: breakdown.reputation_score || 0 });
    }

    if (keywordFlags.length) {
      keywordFlags.forEach((keyword) => {
        contributions.push({ label: `Keyword: "${keyword}"`, value: keywordContribution });
      });
    }

    if (breakdown.url_structure_score) {
      contributions.push({ label: "URL structure", value: breakdown.url_structure_score });
    }

    if (breakdown.domain_age_score) {
      contributions.push({ label: "Domain age", value: breakdown.domain_age_score });
    }

    if (breakdown.ml_score) {
      contributions.push({ label: "ML model signal", value: breakdown.ml_score });
    }

    if (breakdown.context_adjustment) {
      contributions.push({ label: "Context adjustment", value: breakdown.context_adjustment });
    }

    return contributions.length ? contributions : [{ label: "No strong indicators", value: 0 }];
  };

  const getUrlPreview = (scanResult) => {
    const analysis = scanResult?.security_analysis || {};
    const url = scanResult?.url_found || "";
    const urlAnalysis = analysis.url_analysis || {};

    let hostname = "No URL detected";
    let pathname = "/";
    let protocol = "N/A";

    if (url) {
      try {
        const parsed = new URL(url);
        hostname = parsed.hostname || hostname;
        pathname = parsed.pathname || "/";
        protocol = parsed.protocol ? parsed.protocol.replace(":", "") : protocol;
      } catch {
        hostname = url;
      }
    }

    return {
      domain: hostname,
      path: pathname,
      protocol,
      https: urlAnalysis.missing_https ? "No" : "Yes",
      ipBased: urlAnalysis.ip_based ? "Yes" : "No",
      longUrl: urlAnalysis.long_url ? "Yes" : "No",
      domainAge: analysis.domain_age_days,
      flaggedByGoogle: analysis.flagged_by_google_safe_browsing,
    };
  };

  const handleHistorySelect = (scan) => {
    setResult(scan);
    setSelectedScanId(scan._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getPrimaryReason = (scanResult) => {
    if (!scanResult?.security_analysis) return "Insufficient evidence";

    const reasons = [];
    const urlAnalysis = scanResult.security_analysis.url_analysis || {};
    const flagged = scanResult.security_analysis.flagged_by_google_safe_browsing;
    const keywords = scanResult.security_analysis.keyword_flags || [];

    if (flagged) reasons.push("Flagged by Google Safe Browsing");
    if (urlAnalysis.suspicious_tld) reasons.push("Suspicious domain TLD");
    if (urlAnalysis.multiple_subdomains) reasons.push("Excessive subdomains");
    if (urlAnalysis.ip_based) reasons.push("IP-based URL pattern");
    if (urlAnalysis.missing_https) reasons.push("No HTTPS encryption");
    if (keywords.length) reasons.push(`Suspicious keywords: ${keywords.slice(0, 3).join(", ")}`);

    return reasons.length ? reasons.slice(0, 2).join(" + ") : "Low-risk URL and text pattern";
  };

  const toPdfSafeText = (value = "") => String(value)
    .replace(/[\u0080-\uFFFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const handleDownloadReport = () => {
    if (!result) return;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const left = 14;
    const right = 196;
    const contentWidth = right - left;
    let y = 16;

    const ensureSpace = (requiredHeight = 10) => {
      if (y + requiredHeight <= 285) return;
      doc.addPage();
      y = 16;
    };

    const addParagraph = (text, fontSize = 11, lineGap = 5.5) => {
      const safeText = toPdfSafeText(text || "N/A");
      const wrapped = doc.splitTextToSize(safeText, contentWidth);
      doc.setFontSize(fontSize);
      doc.setTextColor(17, 24, 39);
      wrapped.forEach((line) => {
        ensureSpace(lineGap + 1);
        doc.text(line, left, y);
        y += lineGap;
      });
    };

    const addSectionTitle = (title) => {
      ensureSpace(12);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.line(left, y - 2, right, y - 2);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(37, 99, 235);
      doc.text(toPdfSafeText(title), left, y + 4);
      y += 10;
      doc.setFont("helvetica", "normal");
    };

    const scoreDetails = getDisplayScoreInfo(result.category, result.risk_score);
    const riskInfo = getRiskLevelInfo(result.category, result.risk_score);
    const recommendation = toPdfSafeText(riskInfo.recommendation)
      .replace(/^\W+/, "")
      .trim();
    const explanation = getPrimaryReason(result);
    const source = (result.url_found || result.message || "N/A").toString();
    const issues = getDetectedIssues(result).slice(0, 5).map((item) => item.label);

    doc.setFillColor(15, 23, 42);
    doc.roundedRect(left - 2, y - 8, contentWidth + 4, 22, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(248, 250, 252);
    doc.setFontSize(15);
    doc.text("FraudShield AI - Threat Analysis Report", left, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, left, y + 7);
    y += 22;

    addSectionTitle("Summary");
    addParagraph(`Category: ${result.category || "N/A"}`);
    addParagraph(`${scoreDetails.label}: ${Math.round(scoreDetails.value)}%`);
    addParagraph(`Confidence: ${Math.round(Number(result.confidence_percent) || 0)}%`);
    addParagraph(`Risk Level: ${riskInfo.label}`);

    addSectionTitle("URL / Message");
    addParagraph(source);

    addSectionTitle("Explanation");
    addParagraph(explanation);

    addSectionTitle("Key Issues");
    if (issues.length) {
      issues.forEach((issue) => addParagraph(`- ${issue}`));
    } else {
      addParagraph("- No major issues detected.");
    }

    addSectionTitle("Recommendation");
    addParagraph(recommendation || "Review carefully before opening the link.");

    addSectionTitle("Why This Matters");
    addParagraph("Phishing attacks often mimic trusted services to steal data.");

    const fileDate = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `fraudshield-threat-report-${fileDate}.pdf`;
    doc.save(fileName);
  };

  let currentRiskInfo = getRiskLevelInfo(result?.category, result?.risk_score);
  let detectedIssues = [];
  let detectionSources = [];
  let riskTimeline = [];
  let trustScore = 100;
  let visibleHistory = [];

  try {
    detectedIssues = getDetectedIssues(result);
    detectionSources = getDetectionSources(result);
    riskTimeline = getRiskTimeline(result);
    trustScore = getTrustScore(result?.risk_score);
    visibleHistory = getFilteredHistory();
  } catch {
    detectedIssues = [];
    detectionSources = [];
    riskTimeline = [];
    trustScore = getTrustScore(0);
    visibleHistory = Array.isArray(history) ? history : [];
  }
  const keyIssues = detectedIssues.slice(0, 3);

  const safeHistory = Array.isArray(history)
    ? history.filter((item) => item && typeof item === "object")
    : [];

  const statistics = {
    totalChecks: safeHistory.length,
    safeCount: safeHistory.filter((h) => String(h.category || "").toLowerCase().includes("safe")).length,
    suspiciousCount: safeHistory.filter((h) => String(h.category || "").toLowerCase().includes("suspicious")).length,
    phishingCount: safeHistory.filter((h) => String(h.category || "").toLowerCase().includes("high")).length,
    avgRisk: safeHistory.length
      ? (safeHistory.reduce((sum, h) => sum + (Number(h.risk_score) || 0), 0) / safeHistory.length).toFixed(1)
      : "0.0"
  };

  const keywordFlags = result?.security_analysis?.keyword_flags || [];
  const riskContributions = getRiskContributions(result);
  const urlPreview = getUrlPreview(result);

  return (

    <motion.div 
      className="container dashboard-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >

      <div className="dashboard-header">
        <div className="header-brand">
          <div className="brand-icon-wrap">
            <FaShieldAlt className="brand-icon" />
          </div>
          <div>
            <h1 className="brand-title">FraudShield AI</h1>
            <p className="brand-subtitle">Phishing Detection Console</p>
          </div>
        </div>

        <div className="header-center-copy">
          <p className="header-welcome">
            Welcome, <span className="header-name-highlight">{userName}</span> 👋
          </p>
          <p className="header-support-text">Stay safe - scan messages and URLs with confidence.</p>
        </div>

        <div className="header-actions">
          <motion.button
            className="primary-btn logout-btn"
            onClick={logout}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <FaSignOutAlt />
            Logout
          </motion.button>
        </div>
      </div>

      <ScanForm setResult={setResult} setHistory={setHistory} />

      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast-alert ${toast.tone}`}
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>

        {result && (

          <motion.div

            className={`card result-card ${categoryClass(result.category)}`}

            initial={{ opacity: 0, scale: 0.9 }}

            animate={{ opacity: 1, scale: 1 }}

            exit={{ opacity: 0 }}

          >

            <div className="result-header">

              <div className="result-title-group">
                <FaExclamationTriangle className="result-icon"/>
                <h2>Threat Analysis Report</h2>
              </div>

              <div className={`result-pill ${categoryClass(result.category)}`}>
                {result.category}
              </div>

            </div>

            <div className={`threat-hero ${currentRiskInfo.tone}`}>
              <div className="threat-hero-grid">
                <div>
                  <div className="threat-risk-label">Risk Level: {currentRiskInfo.label} {currentRiskInfo.icon}</div>
                  <div className="threat-score">Score: {Math.round(result.risk_score)}%</div>
                  <div className="trust-score">Trust Score: {trustScore}% ✅</div>
                  <div className="threat-recommendation">{currentRiskInfo.recommendation}</div>
                </div>

                <div className="threat-meter-wrap">
                  <RiskMeter score={result.risk_score} category={result.category}/>
                </div>
              </div>
            </div>

            <div className="result-summary threat-summary">
              <div className="report-subtitle">Key Issues</div>
              <ul className="threat-issues">
                {keyIssues.map((issue, index) => (
                  <li key={`${issue.label}-${index}`}>
                    <span className="issue-mark">✔</span>
                    <span className="issue-text">{issue.label}</span>
                    <span className="issue-impact">+{Math.max(0, Math.round(issue.impact))}%</span>
                  </li>
                ))}
              </ul>

              <div className="report-subtitle">Recommendation</div>
              <div className={`recommendation-box ${currentRiskInfo.tone}`}>
                {currentRiskInfo.recommendation}
              </div>
              <p className="why-matters-helper">
                <strong>Why?</strong> Phishing attacks often mimic trusted services to steal data.
              </p>

              <motion.button
                className="report-download-btn"
                type="button"
                onClick={handleDownloadReport}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Download Report (PDF)
              </motion.button>

              <motion.button
                className="analysis-toggle-btn"
                type="button"
                onClick={() => setShowFullAnalysis((value) => !value)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🔍 {showFullAnalysis ? "Hide Full Analysis" : "View Full Analysis"}
              </motion.button>
            </div>

            <AnimatePresence initial={false}>
              {showFullAnalysis && (
                <motion.div
                  className="full-analysis-panel"
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="xai-grid">
                    <div className="xai-card">
                      <h3>Why it was flagged</h3>
                      <div className="xai-message">
                        {getHighlightedMessage(result.message || result.url_found || "No message available.", keywordFlags)}
                      </div>

                      <div className="xai-risk-list">
                        <h4>Detected Risks</h4>
                        <ul>
                          {riskContributions.map((item, index) => (
                            <li key={`${item.label}-${index}`}>
                              <span className="risk-label-text">{item.label}</span>
                              <span className={`risk-value ${item.value > 0 ? "positive" : item.value < 0 ? "negative" : "neutral"}`}>
                                {formatContribution(item.value)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="xai-card url-card">
                      <h3>URL Preview</h3>
                      <div className="url-preview-domain">{urlPreview.domain}</div>
                      <div className="url-preview-path">{urlPreview.path}</div>

                      <div className="url-meta-grid">
                        <div className="url-meta-item">
                          <span className="meta-label">Protocol</span>
                          <span className="meta-value">{urlPreview.protocol}</span>
                        </div>
                        <div className="url-meta-item">
                          <span className="meta-label">HTTPS</span>
                          <span className={`meta-value ${urlPreview.https === "Yes" ? "good" : "bad"}`}>{urlPreview.https === "Yes" ? "🔒 Yes" : "❌ No"}</span>
                        </div>
                        <div className="url-meta-item">
                          <span className="meta-label">IP-based</span>
                          <span className={`meta-value ${urlPreview.ipBased === "Yes" ? "bad" : "good"}`}>{urlPreview.ipBased === "Yes" ? "⚠️ Yes" : "No"}</span>
                        </div>
                        <div className="url-meta-item">
                          <span className="meta-label">Domain age</span>
                          <span className={`meta-value ${typeof urlPreview.domainAge === "number" && urlPreview.domainAge < 30 ? "bad" : "good"}`}>
                            {typeof urlPreview.domainAge === "number" ? `${urlPreview.domainAge} days${urlPreview.domainAge < 30 ? " ⚠️" : ""}` : "Unknown"}
                          </span>
                        </div>
                      </div>

                      <div className="whois-box">
                        <span className="meta-label">WHOIS-like snapshot</span>
                        <p>{urlPreview.flaggedByGoogle ? "Google Safe Browsing matched this URL." : "No reputation match found in the current lookup."}</p>
                        <p>{urlPreview.longUrl === "Yes" ? "Long URL pattern detected." : "URL length looks normal."}</p>
                      </div>
                    </div>
                  </div>

                  <div className="full-analysis-grid">
                    <div className="full-analysis-card">
                      <div className="report-subtitle">Risk Build-Up</div>
                      <div className="risk-timeline">
                        {riskTimeline.map((step) => (
                          <div key={step.label} className={`timeline-step ${step.tone}`}>
                            <div className="timeline-row">
                              <span className="timeline-label">{step.label}</span>
                              <span className="timeline-value">+{Math.max(0, Math.round(step.value))}%</span>
                            </div>
                            <div className="timeline-bar">
                              <motion.div
                                className="timeline-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, Math.max(0, step.value))}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="full-analysis-card">
                      <div className="report-subtitle">Detection Sources</div>
                      <div className="detection-sources">
                        {detectionSources.map((source) => (
                          <div key={source.label} className={`source-pill ${source.tone}`}>
                            <span className="source-label">{source.label}</span>
                            <span className="source-value">{source.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="result-details">
              <p>

                <strong>Confidence:</strong>

                {result.confidence_percent}%

              </p>

            </div>

            <div className="explanation-section">

              <h3>Security Analysis</h3>

              <ul>

                {getAnalysisItems().map((r,i)=>(

                  <li key={i}>{r}</li>

                ))}

              </ul>

            </div>

          </motion.div>

        )}

      </AnimatePresence>

      <div className="history-section">

        <div className="stats-grid">
          <div className="stat-card"><h4>Checked Links</h4><p>{statistics.totalChecks}</p></div>
          <div className="stat-card"><h4>Average Risk</h4><p>{statistics.avgRisk}%</p></div>
          <div className="stat-card"><h4>Suspicious</h4><p>{statistics.suspiciousCount}</p></div>
          <div className="stat-card"><h4>Phishing</h4><p>{statistics.phishingCount}</p></div>
        </div>

        <div className="section-header">

          <FaHistory className="section-icon"/>

          <h2>Scan History</h2>

        </div>

        <div className="history-filters">
          <select value={historyCategoryFilter} onChange={(e) => setHistoryCategoryFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="safe">Safe</option>
            <option value="suspicious">Suspicious</option>
            <option value="high">High Risk</option>
          </select>

          <input
            type="date"
            value={historyDateFilter}
            onChange={(e) => setHistoryDateFilter(e.target.value)}
          />
        </div>

        <div className="security-controls-card">
          <h3>Security Hardening</h3>
          <div className="security-badges">
            <span>JWT Authentication</span>
            <span>Rate Limiting</span>
            <span>Input Sanitization</span>
          </div>
        </div>

        <div className="history-hint">Click any history item to open the full breakdown above.</div>

        <div className="history-grid">

          {visibleHistory.map((scan, index)=> (

            <HistoryCard
              key={scan._id}
              scan={scan}
              index={index}
              onSelect={handleHistorySelect}
              isSelected={selectedScanId === scan._id}
            />

          ))}

        </div>

      </div>

    </motion.div>

  );

}

export default Dashboard;