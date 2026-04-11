import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaShieldAlt, FaUserShield, FaRocket } from "react-icons/fa";

function Home() {
  const navigate = useNavigate();

  const startFreshLogin = (adminMode = false) => {
    // Always begin from login screen instead of reusing stale session tokens.
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate(adminMode ? "/login?admin=true" : "/login");
  };

  return (
    <div style={page}>

      {/* Animated background particles */}
      <div style={particles}>
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: '4px',
              height: '4px',
              background: 'rgba(102, 126, 234, 0.6)',
              borderRadius: '50%',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Subtle futuristic glow */}
      <div style={glowLeft}></div>
      <div style={glowRight}></div>

      {/* NAVBAR */}
      <motion.div 
        style={navbar}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div style={brand}>
          <FaShieldAlt style={{ marginRight: '8px' }} />
          FRAUDSHIELD AI
        </div>

        <motion.button
          style={adminBtn}
          onClick={() => startFreshLogin(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaUserShield style={{ marginRight: '6px' }} />
          Admin Login
        </motion.button>
      </motion.div>

      {/* HERO */}
      <div style={hero}>
        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={title}
        >
          <FaShieldAlt style={{ marginRight: '15px', fontSize: '50px' }} />
          Intelligent Fraud Defense
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          style={subtitle}
        >
          AI-powered SMS & URL threat detection platform engineered
          for real-time protection across enterprise digital ecosystems.
        </motion.p>

        <motion.button
          whileHover={{ y: -3, boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)' }}
          whileTap={{ scale: 0.98 }}
          style={mainButton}
          onClick={() => startFreshLogin(false)}
        >
          <FaRocket style={{ marginRight: '8px' }} />
          Access Platform
        </motion.button>
      </div>

    </div>
  );
}

export default Home;


/* ================= STYLES ================= */

const page = {
  height: "100vh",
  width: "100vw",
  background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)",
  color: "#f1f5f9",
  fontFamily: "'Inter', sans-serif",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  overflow: "hidden",
};

const particles = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
};



const glowLeft = {
  position: "absolute",
  width: "700px",
  height: "700px",
  background:
    "radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)",
  top: "-200px",
  left: "-200px",
  filter: "blur(100px)",
};

const glowRight = {
  position: "absolute",
  width: "700px",
  height: "700px",
  background:
    "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)",
  bottom: "-200px",
  right: "-200px",
  filter: "blur(100px)",
};

/* NAVBAR */

const navbar = {
  position: "absolute",
  top: "28px",
  width: "94%",
  maxWidth: "1400px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const brand = {
  fontSize: "14px",
  fontWeight: "600",
  letterSpacing: "2px",
  color: "#94a3b8",
};

/* HERO */

const hero = {
  height: "100%",
  width: "100%",
  maxWidth: "900px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  padding: "0 20px",
};

const title = {
  fontSize: "60px",
  fontWeight: "600",
  marginBottom: "18px",
  letterSpacing: "-0.4px",
};

const subtitle = {
  fontSize: "17px",
  maxWidth: "680px",
  color: "#cbd5e1",
  lineHeight: "1.8",
  marginBottom: "38px",
};

const mainButton = {
  padding: "14px 36px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)",
  color: "#f8fafc",
  fontWeight: "500",
  fontSize: "14px",
  cursor: "pointer",
  backdropFilter: "blur(6px)",
};

const adminBtn = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "#cbd5e1",
  fontSize: "12px",
  fontWeight: "500",
  cursor: "pointer",
  backdropFilter: "blur(6px)",
};