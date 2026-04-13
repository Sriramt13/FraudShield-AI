import axios from "axios";

const buildFallbackResult = (message) => {
  const text = String(message || "").toLowerCase();
  const keywordGroups = {
    urgency: ["urgent", "immediately", "asap", "act now", "limited time", "final warning"],
    credentials: ["verify", "login", "password", "otp", "pin", "2fa", "kyc"],
    accountThreat: ["suspended", "blocked", "locked", "deactivated", "restricted"],
    rewardBait: ["winner", "won", "claim", "free", "gift", "bonus", "reward", "prize"],
    payment: ["bank", "account", "wallet", "payment", "invoice", "refund", "transfer"]
  };

  const allKeywords = Object.values(keywordGroups).flat();
  const keywordFlags = allKeywords.filter((word) => text.includes(word));

  const safeContextPhrases = [
    "don't click", "do not click", "avoid suspicious", "stay safe", "be careful", "security tip"
  ];
  const hasSafeContext = safeContextPhrases.some((phrase) => text.includes(phrase));

  const hasUrl = /(https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})/i.test(text);
  const hasShortener = /(bit\.ly|tinyurl\.com|rb\.gy|t\.co|cutt\.ly|ow\.ly)/i.test(text);
  const hasIpUrl = /(https?:\/\/)?\d{1,3}(\.\d{1,3}){3}/i.test(text);
  const suspiciousTld = /\.(tk|top|xyz|click|gq|ml|ru|cn)(\b|\/)/i.test(text);
  const hasAtOrEncoded = /(@|%40|%2e|%2f)/i.test(text);

  const impersonationBrands = ["paypal", "microsoft", "google", "amazon", "apple", "bank", "sbi", "hdfc", "icici"];
  const hasBrand = impersonationBrands.some((b) => text.includes(b));

  let keywordScore = 0;
  keywordScore += keywordGroups.urgency.filter((w) => text.includes(w)).length * 8;
  keywordScore += keywordGroups.credentials.filter((w) => text.includes(w)).length * 10;
  keywordScore += keywordGroups.accountThreat.filter((w) => text.includes(w)).length * 9;
  keywordScore += keywordGroups.rewardBait.filter((w) => text.includes(w)).length * 7;
  keywordScore += keywordGroups.payment.filter((w) => text.includes(w)).length * 6;

  let urlScore = 0;
  if (hasUrl) urlScore += 14;
  if (hasShortener) urlScore += 20;
  if (hasIpUrl) urlScore += 24;
  if (suspiciousTld) urlScore += 16;
  if (hasAtOrEncoded) urlScore += 10;

  let comboBoost = 0;
  if (hasUrl && hasBrand && keywordGroups.credentials.some((w) => text.includes(w))) {
    comboBoost += 18;
  }
  if (hasUrl && keywordGroups.accountThreat.some((w) => text.includes(w))) {
    comboBoost += 12;
  }

  let riskScore = Math.min(keywordScore + urlScore + comboBoost, 97);
  if (hasSafeContext && riskScore < 45) {
    riskScore = Math.max(0, riskScore - 20);
  }

  let category = "Safe";
  if (riskScore > 65) {
    category = "High Risk - Phishing";
  } else if (riskScore > 28) {
    category = "Suspicious";
  }

  return {
    category,
    risk_score: riskScore,
    confidence_percent: Math.min(55 + Math.floor(riskScore / 2), 92),
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