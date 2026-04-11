import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaTrash,
  FaShieldAlt,
  FaUser,
  FaEye,
  FaTimes,
  FaSearch,
  FaDownload,
  FaFlag,
  FaBan,
  FaLock,
  FaUnlock,
  FaSpinner
} from "react-icons/fa";
import jsPDF from "jspdf";
import API from "../services/api";
import "./AdminPanel.css";

function AdminPanel({ onUserUpdate, onNotify }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);
  const [pendingFlagUser, setPendingFlagUser] = useState(null);
  const [flagReason, setFlagReason] = useState("");

  useEffect(() => {
    loadUsers();
  }, [page, searchQuery]);

  const notify = (message, tone = "success") => {
    if (typeof onNotify === "function") {
      onNotify(message, tone);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }

      const res = await API.get(`/admin/users?${params.toString()}`);
      setUsers(Array.isArray(res.data.data) ? res.data.data : []);
      setPagination(res.data.pagination || null);
    } catch (error) {
      console.error("Failed to load users:", error);
      notify("Failed to load users", "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      setActionLoading({ userId, type: "role" });
      await API.put(`/admin/users/${userId}/role`, { role: newRole });
      await loadUsers();
      if (typeof onUserUpdate === "function") onUserUpdate();
      notify("User role updated successfully", "success");
    } catch (error) {
      console.error("Failed to update role:", error);
      notify(error?.response?.data?.message || "Failed to update user role", "danger");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      setActionLoading({ userId: user._id, type: "status" });
      const nextStatus = user.status === "suspended" ? "active" : "suspended";
      await API.patch(`/admin/users/${user._id}/status`, { status: nextStatus });
      await loadUsers();
      if (typeof onUserUpdate === "function") onUserUpdate();
      notify(nextStatus === "suspended" ? "User suspended" : "User restored", "success");
    } catch (error) {
      console.error("Failed to update user status:", error);
      notify(error?.response?.data?.message || "Failed to update status", "danger");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFlagUser = async (user, flagged, reason) => {
    try {
      setActionLoading({ userId: user._id, type: flagged ? "flag" : "unflag" });
      await API.patch(`/admin/users/${user._id}/status`, {
        flagged,
        flagReason: reason || ""
      });
      await loadUsers();
      if (typeof onUserUpdate === "function") onUserUpdate();
      notify(flagged ? "User flagged for review" : "User unflagged", "success");
    } catch (error) {
      console.error("Failed to flag user:", error);
      notify(error?.response?.data?.message || "Failed to update flag status", "danger");
    } finally {
      setActionLoading(null);
    }
  };

  const openFlagDialog = (user) => {
    if (user.flagged) {
      handleFlagUser(user, false, "");
      return;
    }

    setPendingFlagUser(user);
    setFlagReason(user.flagReason || "Suspicious activity requires review");
  };

  const handleDeleteUser = (user) => {
    setPendingDeleteUser(user);
  };

  const confirmDeleteUser = async () => {
    if (!pendingDeleteUser) return;

    try {
      setDeleting(pendingDeleteUser._id);
      await API.delete(`/admin/users/${pendingDeleteUser._id}`);
      await loadUsers();
      if (typeof onUserUpdate === "function") onUserUpdate();
      notify("User deleted successfully", "success");
    } catch (error) {
      console.error("Failed to delete user:", error);
      notify(error?.response?.data?.message || "Failed to delete user", "danger");
    } finally {
      setDeleting(null);
      setPendingDeleteUser(null);
    }
  };

  const handleViewDetails = async (userId) => {
    try {
      const res = await API.get(`/admin/users/${userId}`);
      setSelectedUser(res.data.data);
      setShowModal(true);
    } catch (error) {
      console.error("Failed to load user details:", error);
      notify("Failed to load user details", "danger");
    }
  };

  const exportUsersCsv = () => {
    if (!users.length) return;

    const headers = ["Name", "Email", "Role", "Status", "Flagged", "Created"];
    const rows = users.map((user) => [
      user.name,
      user.email,
      user.role,
      user.status || "active",
      user.flagged ? "Yes" : "No",
      user.createdAt ? new Date(user.createdAt).toLocaleString() : ""
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fraudshield-users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);

    notify("CSV export downloaded", "success");
  };

  const downloadUserReport = () => {
    if (!selectedUser) return;

    const doc = new jsPDF();
    const user = selectedUser.user || {};
    const riskStats = selectedUser.riskStats || {};
    const activitySummary = selectedUser.activitySummary || {};
    const scans = Array.isArray(selectedUser.scans) ? selectedUser.scans : [];
    const wrap = (text, width) => doc.splitTextToSize(String(text || ""), width);
    const sectionHeader = (title, y) => {
      doc.setFillColor(102, 126, 234);
      doc.roundedRect(14, y - 5, 182, 10, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title, 18, y + 2);
      return y + 14;
    };

    let y = 14;
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(14, 10, 182, 24, 3, 3, "F");
    doc.setTextColor(226, 232, 240);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("FraudShield AI", 18, 20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("User Activity Report", 18, 27);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 190, 27, { align: "right" });

    y = sectionHeader("User Profile", 40);
    const profileRows = [
      ["Name", user.name || "N/A"],
      ["Email", user.email || "N/A"],
      ["Role", user.role || "N/A"],
      ["Status", user.status || "active"],
      ["Flagged", user.flagged ? "Yes" : "No"],
      ["Member Since", user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"]
    ];

    doc.setFontSize(10);
    profileRows.forEach(([label, value]) => {
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, 18, y);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      const wrapped = wrap(value, 135);
      doc.text(wrapped, 56, y);
      y += Math.max(8, wrapped.length * 5);
    });

    y = sectionHeader("Activity Summary", y + 4);
    const summaryRows = [
      ["Total Scans", riskStats.total || 0],
      ["Safe", riskStats.safe || 0],
      ["Suspicious", riskStats.suspicious || 0],
      ["High Risk", riskStats.highRisk || 0],
      ["Average Risk", `${activitySummary.averageRisk || 0}%`],
      ["Behavior", activitySummary.riskBehavior || "N/A"],
      ["Last Scan", activitySummary.lastScanAt ? new Date(activitySummary.lastScanAt).toLocaleString() : "N/A"]
    ];

    summaryRows.forEach(([label, value]) => {
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, 18, y);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      doc.text(wrap(value, 135), 60, y);
      y += 8;
    });

    y = sectionHeader("Recent Scans", y + 4);
    scans.slice(0, 8).forEach((scan, index) => {
      if (y > 270) {
        doc.addPage();
        y = 18;
      }

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, y - 4, 182, 18, 2, 2, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, y - 4, 182, 18, 2, 2, "S");

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`${index + 1}. ${scan.category || "Unknown"}`, 18, y + 2);
      doc.setFont("helvetica", "normal");
      doc.text(`${Number(scan.risk_score) || 0}%`, 190, y + 2, { align: "right" });
      doc.setTextColor(71, 85, 105);
      const wrappedMessage = wrap(scan.message || "", 150);
      doc.text(wrappedMessage.slice(0, 2), 18, y + 8);
      y += 23;
    });

    const fileName = `fraudshield-user-${(user.name || "report").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

    notify("User report downloaded", "success");
  };

  const getStatusTone = (status = "active") => (status === "suspended" ? "danger" : "success");
  const getFlagTone = (flagged) => (flagged ? "warning" : "success");
  const getActivitySummary = () => selectedUser?.activitySummary || {};
  const visibleCount = pagination?.total || users.length;
  const selectedUserData = selectedUser?.user || {};

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
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div className="admin-panel" variants={containerVariants} initial="hidden" animate="visible">
      <div className="panel-header-row">
        <motion.h2 initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          User Management
        </motion.h2>

        <div className="panel-header-actions">
          <div className="user-count-pill">{visibleCount} users</div>
          <motion.button className="export-btn" onClick={exportUsersCsv} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} disabled={!users.length}>
            <FaDownload /> Export CSV
          </motion.button>
        </div>
      </div>

      <div className="users-toolbar">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email"
          />
        </div>
      </div>

      {loading ? (
        <motion.div className="loading-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="spinner"></div>
          <p>Loading users...</p>
        </motion.div>
      ) : (
        <>
          <motion.div className="users-table-container" variants={itemVariants}>
            {users.length ? (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Flag</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {users.map((user, index) => {
                      const roleLoading = actionLoading?.userId === user._id && actionLoading?.type === "role";
                      const statusLoading = actionLoading?.userId === user._id && actionLoading?.type === "status";
                      const flagLoading = actionLoading?.userId === user._id && (actionLoading?.type === "flag" || actionLoading?.type === "unflag");
                      const isSystemAdmin = Boolean(user.isSystemAdmin);

                      return (
                        <motion.tr
                          key={user._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ backgroundColor: "rgba(0,212,255,0.1)" }}
                        >
                          <td className="user-name">
                            <FaUser style={{ marginRight: "8px", color: "#00d4ff" }} />
                            <div>
                              <div>{user.name}</div>
                              <div className="user-meta">{user.flagReason || ""}</div>
                            </div>
                          </td>
                          <td>{user.email}</td>
                          <td>
                            <select
                              value={user.role}
                              onChange={(e) => handleUpdateRole(user._id, e.target.value)}
                              className={`role-select ${user.role}`}
                              disabled={deleting === user._id || roleLoading || isSystemAdmin}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td>
                            <span className={`status-badge ${getStatusTone(user.status)}`}>
                              {user.status === "suspended" ? <FaLock /> : <FaUnlock />}
                              {user.status || "active"}
                              {isSystemAdmin && <span className="system-tag">Default admin</span>}
                            </span>
                          </td>
                          <td>
                            <span className={`flag-badge ${getFlagTone(user.flagged)}`}>
                              <FaFlag /> {user.flagged ? "Flagged" : "Clear"}
                            </span>
                          </td>
                          <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</td>
                          <td className="actions">
                            <motion.button className="view-btn" onClick={() => handleViewDetails(user._id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={deleting === user._id}>
                              <FaEye /> View
                            </motion.button>

                            <motion.button
                              className={`status-btn ${user.status === "suspended" ? "active" : "danger"}`}
                              onClick={() => handleToggleStatus(user)}
                              disabled={deleting === user._id || statusLoading || isSystemAdmin}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              {statusLoading ? <FaSpinner className="mini-spin" /> : user.status === "suspended" ? <FaUnlock /> : <FaBan />}
                              {user.status === "suspended" ? "Activate" : "Suspend"}
                            </motion.button>

                            <motion.button
                              className={`flag-btn ${user.flagged ? "clear" : "warning"}`}
                              onClick={() => openFlagDialog(user)}
                              disabled={deleting === user._id || flagLoading || isSystemAdmin}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              {flagLoading ? <FaSpinner className="mini-spin" /> : <FaFlag />}
                              {user.flagged ? "Unflag" : "Flag"}
                            </motion.button>

                            <motion.button
                              className="delete-btn"
                              onClick={() => handleDeleteUser(user)}
                              disabled={deleting === user._id || isSystemAdmin}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <FaTrash /> {isSystemAdmin ? "Locked" : deleting === user._id ? "Deleting..." : "Delete"}
                            </motion.button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            ) : (
              <div className="empty-users-state">
                <h3>No users found</h3>
                <p>Try a different search term or clear the search box.</p>
              </div>
            )}
          </motion.div>

          {pagination && (
            <motion.div className="pagination" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <button onClick={() => setPage(page - 1)} disabled={page === 1} className="pagination-btn">
                Previous
              </button>
              <span className="page-info">
                Page {page} of {pagination.pages} ({pagination.total} total)
              </span>
              <button onClick={() => setPage(page + 1)} disabled={page === pagination.pages} className="pagination-btn">
                Next
              </button>
            </motion.div>
          )}
        </>
      )}

      <AnimatePresence>
        {showModal && selectedUser && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)}>
            <motion.div className="modal-content" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>User Details</h3>
                <motion.button className="close-btn" onClick={() => setShowModal(false)} whileHover={{ rotate: 90 }}>
                  <FaTimes />
                </motion.button>
              </div>

              <div className="modal-body">
                <div className="detail-row">
                  <label>Name:</label>
                  <span>{selectedUserData.name}</span>
                </div>

                <div className="detail-row">
                  <label>Email:</label>
                  <span>{selectedUserData.email}</span>
                </div>

                <div className="detail-row">
                  <label>Role:</label>
                  <span className={`role-badge ${selectedUserData.role}`}>
                    {selectedUserData.role === "admin" ? <FaShieldAlt /> : <FaUser />}
                    {selectedUserData.role}
                  </span>
                </div>

                <div className="detail-row">
                  <label>Status:</label>
                  <span className={`status-badge ${getStatusTone(selectedUserData.status)}`}>
                    {selectedUserData.status === "suspended" ? <FaLock /> : <FaUnlock />}
                    {selectedUserData.status || "active"}
                  </span>
                </div>

                <div className="detail-row">
                  <label>Flag:</label>
                  <span className={`flag-badge ${getFlagTone(selectedUserData.flagged)}`}>
                    <FaFlag /> {selectedUserData.flagged ? "Flagged" : "Clear"}
                  </span>
                </div>

                <div className="detail-row">
                  <label>Member Since:</label>
                  <span>{selectedUserData.createdAt ? new Date(selectedUserData.createdAt).toLocaleDateString() : "-"}</span>
                </div>

                <h4>Activity Overview</h4>
                <div className="activity-summary-grid">
                  <div className="activity-summary-card">
                    <span className="label">Behavior</span>
                    <span className="value">{getActivitySummary().riskBehavior || "No scan activity yet"}</span>
                  </div>
                  <div className="activity-summary-card">
                    <span className="label">Average Risk</span>
                    <span className="value">{getActivitySummary().averageRisk || 0}%</span>
                  </div>
                  <div className="activity-summary-card">
                    <span className="label">Last Scan</span>
                    <span className="value">{getActivitySummary().lastScanAt ? new Date(getActivitySummary().lastScanAt).toLocaleString() : "-"}</span>
                  </div>
                </div>

                <h4>Scan Statistics</h4>
                <div className="stats-grid-small">
                  <div className="stat">
                    <span className="label">Total Scans</span>
                    <span className="value">{selectedUser.riskStats?.total || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Safe</span>
                    <span className="value safe">{selectedUser.riskStats?.safe || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Suspicious</span>
                    <span className="value suspicious">{selectedUser.riskStats?.suspicious || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="label">High Risk</span>
                    <span className="value danger">{selectedUser.riskStats?.highRisk || 0}</span>
                  </div>
                </div>

                {selectedUser.scans && selectedUser.scans.length > 0 && (
                  <div className="recent-scans">
                    <div className="recent-scans-header">
                      <h4>Recent Scans</h4>
                      <motion.button className="report-btn" onClick={downloadUserReport} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                        <FaDownload /> Download Report
                      </motion.button>
                    </div>
                    <div className="scans-list">
                      {selectedUser.scans.slice(0, 5).map((scan, index) => (
                        <motion.div
                          key={scan._id}
                          className={`scan-item ${String(scan.category || "").toLowerCase().replace(/\s+/g, "-")}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <span className="category">{scan.category}</span>
                          <span className="score">{scan.risk_score}%</span>
                          <span className="date">{new Date(scan.scannedAt).toLocaleDateString()}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDeleteUser && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="confirm-modal" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}>
              <h3>Confirm Delete</h3>
              <p>Are you sure you want to delete this user?</p>
              <div className="confirm-user-card">
                <strong>{pendingDeleteUser.name}</strong>
                <span>{pendingDeleteUser.email}</span>
              </div>
              <div className="confirm-actions">
                <button className="cancel-btn" onClick={() => setPendingDeleteUser(null)}>Cancel</button>
                <button className="confirm-delete-btn" onClick={confirmDeleteUser} disabled={deleting === pendingDeleteUser._id}>
                  {deleting === pendingDeleteUser._id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingFlagUser && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="confirm-modal" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}>
              <h3>Flag User</h3>
              <p>Add a short reason for flagging this account.</p>
              <textarea
                className="flag-textarea"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                rows="4"
                placeholder="Reason for flagging"
              />
              <div className="confirm-actions">
                <button className="cancel-btn" onClick={() => setPendingFlagUser(null)}>Cancel</button>
                <button
                  className="confirm-flag-btn"
                  onClick={() => {
                    handleFlagUser(pendingFlagUser, true, flagReason);
                    setPendingFlagUser(null);
                  }}
                >
                  Flag User
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default AdminPanel;
