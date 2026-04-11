import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";

const parseJwtPayload = (token) => {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const parseStoredUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

function App() {

  // Enforce session-only auth (no persistent auto-login from old localStorage data).
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  const token = sessionStorage.getItem("token");
  const payload = token ? parseJwtPayload(token) : null;
  const storedUser = parseStoredUser();
  const userRole = payload?.role || storedUser?.role || null;
  const isAuthenticated = Boolean(token && userRole);
  const homeRedirect = userRole === "admin" ? "/admin" : "/dashboard";

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to={homeRedirect} replace /> : <Home />}
        />

        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to={homeRedirect} replace /> : <Login />}
        />

        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to={homeRedirect} replace /> : <Register />}
        />

        <Route
          path="/dashboard"
          element={isAuthenticated && userRole === "user" ? <Dashboard /> : isAuthenticated && userRole === "admin" ? <Navigate to="/admin" replace /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/admin"
          element={isAuthenticated && userRole === "admin" ? <AdminDashboard /> : <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
        />

      </Routes>
    </Router>
  );
}

export default App;