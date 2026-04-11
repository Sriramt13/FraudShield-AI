from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import re
from urllib.parse import urlparse
import datetime
from concurrent.futures import ThreadPoolExecutor, TimeoutError
import tldextract
import whois
import requests
import os
from dotenv import load_dotenv

# ===============================
# LOAD ENV VARIABLES
# ===============================
load_dotenv()
SAFE_BROWSING_KEY = os.getenv("GOOGLE_SAFE_BROWSING_KEY")
WHOIS_TIMEOUT_SECONDS = 2
WHOIS_EXECUTOR = ThreadPoolExecutor(max_workers=2)

# ===============================
# INIT APP
# ===============================
app = Flask(__name__)
CORS(app)

# ===============================
# LOAD ML MODEL
# ===============================
try:
    with open("phishing_model.pkl", "rb") as f:
        model = pickle.load(f)

    with open("vectorizer.pkl", "rb") as f:
        vectorizer = pickle.load(f)

    print("✅ ML Model Loaded Successfully")

except Exception as e:
    print("❌ Model loading failed:", e)
    model = None
    vectorizer = None


# ===============================
# HELPER FUNCTIONS
# ===============================

def extract_url(text):
    # Accept full URLs, www links, and common bare domains.
    pattern = r"((?:https?://|www\.)[^\s]+|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:/[^\s]*)?)"
    match = re.search(pattern, text)
    return match.group(0) if match else None


def normalize_url(url):
    if not url:
        return None
    cleaned = url.strip().strip(".,)")
    if cleaned.startswith("www."):
        return "https://" + cleaned
    if re.match(r"^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+", cleaned) and not cleaned.startswith("http"):
        return "https://" + cleaned
    return cleaned


def analyze_url_features(url):
    score = 0
    details = {}

    parsed = urlparse(url)
    domain = (parsed.netloc or "").lower()
    host = domain.split(":")[0]
    path = (parsed.path or "").lower()

    # Long URL
    details["long_url"] = len(url) > 75
    if details["long_url"]:
        score += 5

    # Suspicious TLD
    suspicious_tlds = ["xyz", "top", "tk", "ru", "cn", "gq", "ml", "click"]
    tld = tldextract.extract(host).suffix.lower()
    details["suspicious_tld"] = tld in suspicious_tlds
    if details["suspicious_tld"]:
        score += 10

    # Multiple subdomains
    details["multiple_subdomains"] = domain.count(".") > 2
    if details["multiple_subdomains"]:
        score += 7

    # IP-based URL
    details["ip_based"] = bool(re.search(r"\d+\.\d+\.\d+\.\d+", domain))
    if details["ip_based"]:
        score += 20

    # Missing HTTPS
    details["missing_https"] = parsed.scheme != "https"
    if details["missing_https"]:
        score += 8

    # URL shorteners are often abused in phishing campaigns
    shortener_domains = [
        "bit.ly", "tinyurl.com", "t.co", "is.gd", "rb.gy", "cutt.ly", "ow.ly"
    ]
    details["url_shortener"] = any(host.endswith(s) for s in shortener_domains)
    if details["url_shortener"]:
        score += 14

    # Punycode can be used for lookalike domains
    details["punycode_domain"] = "xn--" in host
    if details["punycode_domain"]:
        score += 18

    # Heavy hyphenation is a common phishing pattern
    details["excessive_hyphenation"] = host.count("-") >= 2
    if details["excessive_hyphenation"]:
        score += 7

    # Fake login flows often include these path terms
    suspicious_path_terms = ["login", "verify", "update", "signin", "account", "wallet", "kyc", "otp", "secure"]
    details["suspicious_path"] = any(term in path for term in suspicious_path_terms)
    if details["suspicious_path"]:
        score += 10

    # Excessive special characters
    special_chars = len(re.findall(r"[?&=%@]", url))
    details["excessive_special_chars"] = special_chars > 5
    if details["excessive_special_chars"]:
        score += 7

    return score, details


def get_domain_age(url):
    try:
        ext = tldextract.extract(url)
        domain = ext.registered_domain
        future = WHOIS_EXECUTOR.submit(whois.whois, domain)
        try:
            w = future.result(timeout=WHOIS_TIMEOUT_SECONDS)
        except TimeoutError:
            return None

        creation_date = w.creation_date

        if isinstance(creation_date, list):
            creation_date = creation_date[0]

        if isinstance(creation_date, datetime.datetime):
            return (datetime.datetime.now() - creation_date).days
    except:
        return None

    return None


def check_safe_browsing(url):
    if not SAFE_BROWSING_KEY:
        return False

    endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={SAFE_BROWSING_KEY}"

    payload = {
        "client": {
            "clientId": "fraud-link-detection",
            "clientVersion": "1.0"
        },
        "threatInfo": {
            "threatTypes": [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE"
            ],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}]
        }
    }

    try:
        response = requests.post(endpoint, json=payload, timeout=5)
        result = response.json()
        return "matches" in result
    except:
        return False


# ===============================
# HEALTH ROUTE
# ===============================
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ML service running",
        "model_loaded": model is not None,
        "safe_browsing_enabled": SAFE_BROWSING_KEY is not None
    })


# ===============================
# PREDICT ROUTE
# ===============================
@app.route("/predict", methods=["POST"])
def predict():

    if model is None or vectorizer is None:
        return jsonify({"error": "Model not loaded"}), 500

    data = request.get_json()

    if not data or "message" not in data:
        return jsonify({"error": "Message field is required"}), 400

    message = data.get("message", "").strip()
    if message == "":
        return jsonify({"error": "Message cannot be empty"}), 400

    lower_msg = message.lower()
    extracted = extract_url(message)
    url = normalize_url(extracted)

    # Improve ML context for URL-only input
    if url and (message == extracted or message == url):
        message = "URL only: " + message

    # ================= ML SCORE =================
    transformed = vectorizer.transform([message])
    probability = model.predict_proba(transformed)[0][1]
    ml_score = round(probability * 40, 2)

    # ================= KEYWORD SCORE =================
    suspicious_words = [
        "urgent", "verify", "bank", "account",
        "login", "password", "click", "winner",
        "free", "kyc", "suspended", "claim",
        "limited", "offer", "otp"
    ]

    found_keywords = [w for w in suspicious_words if w in lower_msg]
    keyword_score = min(len(found_keywords) * 3, 15)

    # ================= CONTEXT =================
    context_adjustment = 0
    if "don't click" in lower_msg or "do not click" in lower_msg:
        context_adjustment -= 8

    # ================= URL ANALYSIS =================
    url_score = 0
    url_details = {}
    domain_age_score = 0
    domain_age_days = None
    reputation_score = 0
    flagged_by_google = False

    if url:
        url_score, url_details = analyze_url_features(url)

        domain_age_days = get_domain_age(url)
        if domain_age_days is not None:
            if domain_age_days < 30:
                domain_age_score = 15
            elif domain_age_days < 90:
                domain_age_score = 8

        flagged_by_google = check_safe_browsing(url)
        if flagged_by_google:
            reputation_score = 30

    # ================= FINAL SCORE =================
    final_score = (
        ml_score +
        keyword_score +
        url_score +
        domain_age_score +
        reputation_score +
        context_adjustment
    )

    final_score = min(max(round(final_score, 2), 0), 100)

    # Deterministic safety overrides for clearly suspicious URL patterns.
    if flagged_by_google:
        final_score = max(final_score, 85)

    if url and (
        url_details.get("ip_based")
        or url_details.get("punycode_domain")
        or (url_details.get("url_shortener") and keyword_score >= 3)
    ):
        final_score = max(final_score, 65)

    if final_score <= 30:
        category = "Safe"
    elif final_score <= 60:
        category = "Suspicious"
    else:
        category = "High Risk - Phishing"

    return jsonify({
        "category": category,
        "risk_score": final_score,
        "confidence_percent": round(probability * 100, 2),
        "url_found": url,
        "url_clickable": url is not None,
        "risk_breakdown": {
            "ml_score": ml_score,
            "keyword_score": keyword_score,
            "url_structure_score": url_score,
            "domain_age_score": domain_age_score,
            "reputation_score": reputation_score,
            "context_adjustment": context_adjustment
        },
        "security_analysis": {
            "keyword_flags": found_keywords,
            "url_analysis": url_details,
            "domain_age_days": domain_age_days,
            "flagged_by_google_safe_browsing": flagged_by_google
        }
    })


# ===============================
# ROOT
# ===============================
@app.route("/")
def home():
    return "🛡 AI Fraud Detection ML Service Running"


@app.route("/favicon.ico")
def favicon():
    # Browser auto-requests favicon; return no-content to avoid noisy 404 logs.
    return "", 204


if __name__ == "__main__":
    app.run(debug=True, port=5000)