import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FiCheck, FiAlertCircle, FiTrendingUp, FiUsers, FiClock, FiAlertTriangle } from "react-icons/fi";
import API from "../services/api";
import "./SystemUsage.css";

function SystemUsage() {

  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/usage");
      setUsage(res.data.data);
    } catch (error) {
      console.error("Failed to load usage:", error);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  const hourlyUsage = usage?.hourlyUsage || [];
  const dailyUsage = usage?.dailyUsage || [];
  const total24h = hourlyUsage.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const total30d = dailyUsage.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const peakHour = hourlyUsage.length
    ? hourlyUsage.reduce((best, item) => ((Number(item.count) || 0) > (Number(best.count) || 0) ? item : best), hourlyUsage[0])
    : null;
  const peakDay = dailyUsage.length
    ? dailyUsage.reduce((best, item) => ((Number(item.count) || 0) > (Number(best.count) || 0) ? item : best), dailyUsage[0])
    : null;
  const freshnessLabel = usage?.lastUpdated ? new Date(usage.lastUpdated).toLocaleString() : "Unknown";
  const hasData = total24h > 0 || total30d > 0;
  const healthStatus = hasData ? "Healthy" : "No Data";
  const healthTone = hasData ? "healthy" : "empty";

  if (loading) {
    return (
      <motion.div
        className="loading-state"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="spinner"></div>
        <p>Loading usage data...</p>
      </motion.div>
    );
  }

  if (!usage) {
    return (
      <motion.div
        className="error-state"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p>Failed to load usage data. Please try again.</p>
      </motion.div>
    );
  }

  // Mock data for 7-day requests
  const requestsData = [
    { day: 'Mon', requests: 120 },
    { day: 'Tue', requests: 240 },
    { day: 'Wed', requests: 180 },
    { day: 'Thu', requests: 300 },
    { day: 'Fri', requests: 260 },
    { day: 'Sat', requests: 190 },
    { day: 'Sun', requests: 220 }
  ];

  // Mock data for threat detection
  const threatData = [
    { name: 'Phishing', value: 40 },
    { name: 'Spam', value: 25 },
    { name: 'Malware', value: 15 },
    { name: 'Safe', value: 20 }
  ];

  const threatColors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

  // Mock recent activity
  const recentActivity = [
    { id: 1, type: 'scan', user: 'SRT', action: 'scanned a URL', time: '2 mins ago', icon: FiTrendingUp },
    { id: 2, type: 'flag', user: 'SRI', action: 'flagged suspicious link', time: '5 mins ago', icon: FiAlertTriangle },
    { id: 3, type: 'admin', user: 'Admin', action: 'system check completed', time: '10 mins ago', icon: FiCheck },
    { id: 4, type: 'scan', user: 'SRT', action: 'scanned a domain', time: '15 mins ago', icon: FiTrendingUp },
  ];

  return (
    <motion.div
      className="system-usage"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h2
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        System Usage Metrics
      </motion.h2>

      {/* Top Metrics Row */}
      <div className="usage-summary-grid">
        <motion.div className="usage-summary-card" variants={itemVariants}>
          <div className="card-header">
            <FiTrendingUp / >
            <span className="summary-label">API Requests</span>
          </div>
          <span className="summary-value">1,240</span>
        </motion.div>
        <motion.div className="usage-summary-card" variants={itemVariants}>
          <div className="card-header">
            <FiUsers />
            <span className="summary-label">Active Users</span>
          </div>
          <span className="summary-value">18</span>
        </motion.div>
        <motion.div className="usage-summary-card" variants={itemVariants}>
          <div className="card-header">
            <FiClock />
            <span className="summary-label">Avg Response Time</span>
          </div>
          <span className="summary-value">320ms</span>
        </motion.div>
        <motion.div className="usage-summary-card warning" variants={itemVariants}>
          <div className="card-header">
            <FiAlertCircle />
            <span className="summary-label">Error Rate</span>
          </div>
          <span className="summary-value">2.1%</span>
        </motion.div>
      </div>

      <motion.div className="health-banner" variants={itemVariants}>
        <div>
          <div className="health-title">Health Snapshot</div>
          <div className="health-copy">
            All systems operational. API server responding normally with minimal latency and no detected anomalies.
          </div>
        </div>
        <div className="health-meta">
          <span>Status</span>
          <strong className="status-badge running">● Running</strong>
        </div>
      </motion.div>

      {/* Line Chart - Requests in Last 7 Days */}
      <motion.div className="usage-section" variants={itemVariants}>
        <h3>Requests in Last 7 Days</h3>
        <div className="chart-container large">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={requestsData}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                formatter={(value) => [`${value} requests`, 'Volume']}
              />
              <Line 
                type="monotone" 
                dataKey="requests" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5 }}
                activeDot={{ r: 7 }}
                fillOpacity={1} 
                fill="url(#colorRequests)" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Threat Detection & System Health Row */}
      <div className="charts-row">
        {/* Threat Detection Breakdown */}
        <motion.div className="usage-section half-width" variants={itemVariants}>
          <h3>Threat Detection Breakdown</h3>
          <div className="chart-container pie-chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={threatData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {threatData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={threatColors[index % threatColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* System Health Panel */}
        <motion.div className="usage-section half-width" variants={itemVariants}>
          <h3>System Health Panel</h3>
          <div className="health-panel">
            <div className="health-item online">
              <FiCheck className="health-icon" />
              <div className="health-item-content">
                <span className="health-item-label">API Server</span>
                <span className="health-item-status">Online</span>
              </div>
            </div>
            <div className="health-item online">
              <FiCheck className="health-icon" />
              <div className="health-item-content">
                <span className="health-item-label">ML Model</span>
                <span className="health-item-status">Running</span>
              </div>
            </div>
            <div className="health-item online">
              <FiCheck className="health-icon" />
              <div className="health-item-content">
                <span className="health-item-label">Database</span>
                <span className="health-item-status">Connected</span>
              </div>
            </div>
            <div className="health-item warning">
              <FiAlertCircle className="health-icon" />
              <div className="health-item-content">
                <span className="health-item-label">Rate Limit</span>
                <span className="health-item-status">Moderate Load</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity Feed */}
      <motion.div className="usage-section" variants={itemVariants}>
        <h3>Recent Activity Feed</h3>
        <div className="activity-feed">
          {recentActivity.map((activity, index) => {
            const IconComponent = activity.icon;
            return (
              <motion.div 
                key={activity.id}
                className={`activity-item ${activity.type}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="activity-icon">
                  <IconComponent />
                </div>
                <div className="activity-content">
                  <span className="activity-text">
                    <strong>User {activity.user}</strong> {activity.action}
                  </span>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default SystemUsage;
