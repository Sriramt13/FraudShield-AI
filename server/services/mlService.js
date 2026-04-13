import axios from "axios";

const buildFallbackResult = (message) => {
  const text = String(message || "").toLowerCase();
  const suspiciousWords = [
    "urgent", "verify", "bank", "account", "login", "password",
    "click", "winner", "free", "kyc", "suspended", "claim", "otp"
  ];

  const keywordFlags = suspiciousWords.filter((word) => text.includes(word));
  const keywordScore = Math.min(keywordFlags.length * 4, 40);
  const urlDetected = /(https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})/i.test(text);
  const urlScore = urlDetected ? 12 : 0;
  const riskScore = Math.min(keywordScore + urlScore, 95);

  let category = "Safe";
  if (riskScore > 60) {
    category = "High Risk - Phishing";
  } else if (riskScore > 30) {
    category = "Suspicious";
  }

  return {
    category,
    risk_score: riskScore,
    confidence_percent: Math.min(35 + keywordFlags.length * 5, 88),
    url_found: null,
    url_clickable: false,
    risk_breakdown: {
      ml_score: 0,
      keyword_score: keywordScore,
      url_structure_score: urlScore,
      domain_age_score: 0,
      reputation_score: 0,
      context_adjustment: 0
    },
    security_analysis: {
      keyword_flags: keywordFlags,
      url_analysis: {},
      domain_age_days: null,
      flagged_by_google_safe_browsing: false
    }
  };
};

export const callMLService = async (message, mlUrl) => {
  if (!mlUrl) {
    return buildFallbackResult(message);
  }

  const normalizedUrl = mlUrl.replace(/\/+$/, "");
  const predictUrl = normalizedUrl.endsWith("/predict") ? normalizedUrl : `${normalizedUrl}/predict`;

  try {
    const response = await axios.post(predictUrl, { message }, { timeout: 30000 });
    return response.data;
  } catch {
    return buildFallbackResult(message);
  }
};