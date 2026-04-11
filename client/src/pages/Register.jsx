import { useState } from "react";
import { useNavigate,Link } from "react-router-dom";
import { FaUser, FaEnvelope, FaLock, FaUserPlus, FaShieldAlt } from "react-icons/fa";
import API from "../services/api";
import "./Register.css";

function Register(){

  const navigate = useNavigate();

  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {

    e.preventDefault();

    try{

      setLoading(true);
      setError("");

      await API.post("/auth/register",{
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password
      });

      navigate("/login");

    }catch(err){

      setError(
        err.response?.data?.message ||
        "Register failed"
      );

    } finally {
      setLoading(false);
    }

  };

  return(

    <div className="register-container">

      <div className="register-card">

        <div className="register-header">
          <FaShieldAlt className="register-icon" />
          <h2>Create Account</h2>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <input
              placeholder="Name"
              value={name}
              onChange={(e)=>setName(e.target.value)}
              required
              minLength={3}
            />
            <FaUser className="input-icon" />
          </div>

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
              minLength={6}
            />
            <FaLock className="input-icon" />
          </div>

          <button type="submit" disabled={loading}>
            <FaUserPlus />
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p>
          Already have account?
          <Link to="/login"> Login</Link>
        </p>

      </div>

    </div>

  );

}

export default Register;