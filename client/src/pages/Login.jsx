import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaEnvelope, FaLock, FaShieldAlt, FaSignInAlt } from "react-icons/fa";
import API from "../services/api";
import "./Login.css";

function Login() {

  const location = useLocation();
  const isAdminMode = new URLSearchParams(location.search).get("admin") === "true";

  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {

    e.preventDefault();

    try{
      setLoading(true);

      setError("");

      const response = await API.post("/auth/login",{
        email: email.trim().toLowerCase(),
        password
      });

      // Detect token from any possible backend format
      const token =
        response.data.token ||
        response.data.accessToken ||
        response.data.data?.token ||
        response.data.data?.accessToken ||
        response.data.jwt;

      if(!token){
        setError("Token not returned from backend");
        setLoading(false);
        return;
      }

      // Save token
      sessionStorage.setItem("token",token);
      if (response.data.user) {
        sessionStorage.setItem("user", JSON.stringify(response.data.user));
      }
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      const role =
        response.data.user?.role ||
        (() => {
          try {
            return JSON.parse(atob(token.split(".")[1]))?.role;
          } catch {
            return "user";
          }
        })();

      if (isAdminMode && role !== "admin") {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        setError("This login page is for admin accounts only.");
        return;
      }

      // Force route hydration with fresh auth state.
      window.location.assign(role === "admin" ? "/admin" : "/dashboard");

    }catch(err){

      console.error(err);

      const status = err.response?.status;
      const message = err.response?.data?.message;

      if (status === 429) {
        setError(message || "Too many attempts. Please wait and try again.");
      } else {
        setError(message || "Invalid credentials");
      }

    } finally {
      setLoading(false);
    }

  };

  return(

    <div className="login-page">

      <div className="login-card">

        <div className="login-header">
          <FaShieldAlt className="login-icon" />
          <h2>{isAdminMode ? "Admin Login" : "Secure Login"}</h2>
          <p className="admin-badge">{isAdminMode ? "Admin Access Only" : "FraudShield Access"}</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleLogin}>

          <div className="input-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              required
            />
            <FaEnvelope className="input-icon" />
          </div>

          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              required
            />
            <FaLock className="input-icon" />
          </div>

          <button type="submit" className="primary-btn" disabled={loading}>
            <FaSignInAlt />
            {loading ? "Signing in..." : "Login"}
          </button>

        </form>

        {!isAdminMode && (
          <p>
            No account?
            <Link to="/register"> Register</Link>
          </p>
        )}

      </div>

    </div>

  );

}

export default Login;