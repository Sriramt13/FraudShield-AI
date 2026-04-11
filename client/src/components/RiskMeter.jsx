import { motion } from "framer-motion";
import "./RiskMeter.css";

function RiskMeter({ score, category }) {

  const rawScore = Number.isFinite(Number(score)) ? Number(score) : 0;
  const boundedRiskScore = Math.min(100, Math.max(0, rawScore));
  const displayValue = Math.min(100, Math.max(0, category?.toLowerCase().includes("safe") ? 100 - boundedRiskScore : boundedRiskScore));
  const needleAngle = (displayValue * 3.6) - 90;
  const circleRadius = 64;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const circleOffset = circleCircumference - (displayValue / 100) * circleCircumference;

  let color = "#22c55e";
  let label = "Safe";

  const normalizedCategory = (category || "").toLowerCase();

  if (normalizedCategory.includes("high")) {
    color = "#ef4444";
    label = "High Risk";
  } else if (normalizedCategory.includes("suspicious")) {
    color = "#ffa500";
    label = "Suspicious";
  } else if (!category) {
    // Fallback threshold mapping aligned with backend category rules.
    if (boundedRiskScore > 60) {
      color = "#ef4444";
      label = "High Risk";
    } else if (boundedRiskScore > 30) {
      color = "#ffa500";
      label = "Suspicious";
    }
  }

  return (
    <div className="risk-meter-container">
      <motion.div
        className="risk-gauge"
        initial={{ opacity: 0, scale: 0.9, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ "--gauge-color": color }}
      >
        <svg className="risk-gauge-svg" viewBox="0 0 180 180" aria-hidden="true">
          <defs>
            <linearGradient id="riskGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="52%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          <circle className="risk-gauge-track" cx="90" cy="90" r={circleRadius} />
          <motion.circle
            className="risk-gauge-progress"
            cx="90"
            cy="90"
            r={circleRadius}
            stroke="url(#riskGaugeGradient)"
            strokeDasharray={circleCircumference}
            strokeDashoffset={circleOffset}
            initial={{ strokeDashoffset: circleCircumference }}
            animate={{ strokeDashoffset: circleOffset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />

          <motion.line
            className="risk-gauge-needle"
            x1="90"
            y1="90"
            x2="90"
            y2="36"
            initial={{ rotate: -90 }}
            animate={{ rotate: needleAngle }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            style={{ transformOrigin: "90px 90px" }}
          />
        </svg>

        <div className="risk-gauge-center">
          <motion.div
            className="risk-score-display"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <span className="score-number" style={{ color }}>
              {Math.round(displayValue)}%
            </span>
          </motion.div>

          <motion.div
            className="risk-label"
            style={{ color }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {label}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default RiskMeter;