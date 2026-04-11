import { motion } from "framer-motion";
import { FaUsers, FaShieldAlt, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import "./AdminStats.css";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 }
  }
};

function StatCard({ icon, label, value, color, delay }) {
  return (
    <motion.div
      className="stat-card"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      style={{ borderLeftColor: color }}
      whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,212,255,0.2)" }}
    >
      <div className="stat-icon" style={{ color }}>
        {icon}
      </div>
      <div className="stat-content">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </motion.div>
  );
}

function AdminStats({ stats }) {
  if (!stats) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <motion.div
      className="admin-stats"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h2
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        Global Statistics
      </motion.h2>

      <div className="stats-grid">
        <StatCard icon={<FaUsers />} label="Total Users" value={stats.totalUsers} color="#00d4ff" delay={0} />
        <StatCard icon={<FaShieldAlt />} label="Total Scans" value={stats.totalScans} color="#00ff88" delay={0.1} />
        <StatCard icon={<FaCheckCircle />} label="Admins" value={stats.totalAdmins} color="#ff6b6b" delay={0.2} />
        <StatCard icon={<FaExclamationTriangle />} label="Scans (Last 7 Days)" value={stats.recentScans} color="#ffa500" delay={0.3} />
      </div>

      <motion.div
        className="risk-breakdown"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3>Risk Category Breakdown</h3>
        <div className="breakdown-list">
          {stats.riskBreakdown && stats.riskBreakdown.map((item, index) => (
            <motion.div
              key={item._id}
              className="breakdown-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              whileHover={{ x: 10 }}
            >
              <div className="breakdown-label">{item._id || "Unknown"}</div>
              <div className="breakdown-stats">
                <span className="count">Count: {item.count}</span>
                <span className="avg-score">Avg Score: {item.avgScore?.toFixed(1) || 0}%</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {stats.topKeywords && stats.topKeywords.length > 0 && (
        <motion.div
          className="top-keywords"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3>Top Flagged Keywords</h3>
          <div className="keywords-list">
            {stats.topKeywords.map((item, index) => (
              <motion.div
                key={index}
                className="keyword-badge"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.1 }}
              >
                <span>{item._id?.join(", ") || "None"}</span>
                <span className="badge-count">{item.count}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div className="last-updated" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
        Last updated: {new Date(stats.lastUpdated).toLocaleString()}
      </motion.div>
    </motion.div>
  );
}

export default AdminStats;
