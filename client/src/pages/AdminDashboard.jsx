import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaShieldAlt, FaSignOutAlt, FaUsers, FaChartBar, FaServer, FaCog, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import API from "../services/api";

import AdminStats from "../components/AdminStats";
import AdminPanel from "../components/AdminPanel";
import SystemUsage from "./SystemUsage";

import "./AdminDashboard.css";

function AdminDashboard() {

  const [activeTab, setActiveTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());

  const logout = () => {
    API.post("/auth/logout").catch(() => null);
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  useEffect(() => {
    loadStats(true);
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
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadStats = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const res = await API.get("/admin/stats");
      setStats(res.data.data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const refreshStats = async () => {
    await loadStats(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshStats();
    setToast({ message: "Dashboard refreshed", tone: "success" });
    setRefreshing(false);
  };

  const showToast = (message, tone = "success") => {
    setToast({ message, tone });
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "just now";

    const target = new Date(timestamp).getTime();
    if (Number.isNaN(target)) return "just now";

    const seconds = Math.max(0, Math.floor((now - target) / 1000));
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds} sec ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hr ago`;
  };

  const tabs = [
    { id: "stats", label: "Statistics", icon: <FaChartBar /> },
    { id: "users", label: "User Management", icon: <FaUsers /> },
    { id: "system", label: "System Usage", icon: <FaServer /> }
  ];

  return (
    <motion.div
      className="admin-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="admin-header">
        <div className="admin-brand">
          <motion.h1
            initial={{ x: -50 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <FaShieldAlt className="admin-brand-icon" />
            Admin Dashboard
          </motion.h1>
          <p className="admin-brand-subtitle">Security operations, user control, and platform analytics.</p>
        </div>

        <div className="admin-header-actions">
          <motion.button
            className="logout-btn"
            onClick={logout}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <FaSignOutAlt />
            Logout
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            className={`admin-toast ${toast.tone}`}
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
          >
            {toast.tone === "success" ? <FaCheckCircle /> : <FaExclamationTriangle />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="admin-nav">
        {tabs.map((tab, index) => (
          <motion.button
            key={tab.id}
            className={`nav-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {tab.icon}
            {tab.label}
          </motion.button>
        ))}

        <motion.button
          className="refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaCog className={refreshing ? "refresh-spinner" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </motion.button>

        <div className="refresh-meta">
          Last updated: {formatRelativeTime(stats?.lastUpdated)}
        </div>
      </div>

      <div className="admin-content">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              className="loading-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="spinner"></div>
              <p>Loading Dashboard...</p>
            </motion.div>
          )}

          {!loading && activeTab === "stats" && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <AdminStats stats={stats} onRefresh={handleRefresh} />
            </motion.div>
          )}

          {!loading && activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <AdminPanel onUserUpdate={refreshStats} onNotify={showToast} />
            </motion.div>
          )}

          {!loading && activeTab === "system" && (
            <motion.div
              key="system"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <SystemUsage />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default AdminDashboard;
