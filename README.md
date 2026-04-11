# FraudShield AI

FraudShield AI is a full-stack phishing and fraud link detection platform.
It combines a React dashboard, Node/Express APIs, MongoDB persistence, and a Python ML microservice to classify suspicious messages and URLs in real time.

## What This Project Does

- Scans user-submitted messages and links for phishing risk
- Uses ML confidence plus security heuristics (URL structure, keyword flags, domain age, Safe Browsing signals)
- Stores scan history per user
- Supports role-based access (`user`, `admin`)
- Provides an admin control panel for user management and platform analytics
- Tracks live system usage metrics:
  - active users (heartbeat-based)
  - API request trend
  - error rate
  - recent activity feed
  - service health (API, DB, ML)

## Architecture

- Frontend (`client`): React + Vite SPA
- Backend (`server`): Express API with JWT auth and MongoDB
- ML Service (`ml-service`): Flask microservice serving model predictions
- Database: MongoDB (local instance)

Flow:
1. User submits a message/URL from the frontend
2. Backend validates JWT and payload
3. Backend calls ML service `/predict`
4. ML service returns category + score + breakdown
5. Backend saves result to MongoDB
6. Frontend renders risk report, history, and charts

## Core Features

### User Side
- Register/Login
- Scan suspicious messages/URLs
- View risk report:
  - category (`Safe`, `Suspicious`, `High Risk - Phishing`)
  - risk score
  - confidence score
  - breakdown by detection source
- Scan history with filtering and pagination
- Export report (PDF from dashboard)

### Admin Side
- Overview statistics (users, scans, risk distribution)
- User management:
  - role updates
  - status updates (active/suspended)
  - user flagging
  - user deletion protections
- System usage dashboard:
  - real-time cards
  - request trend chart
  - threat breakdown chart
  - health panel (DB/API/ML)
  - recent activity stream

### Real-Time Metrics
- Heartbeat endpoint (`/api/heartbeat`) keeps active-user tracking accurate
- Active user timeout window maintained in in-memory metrics service
- Request success/failure counters drive error rate and trend visuals

## Tech Stack

### Frontend
- React 19
- Vite 7
- Axios
- Framer Motion
- Recharts
- React Icons
- jsPDF + html2canvas

### Backend
- Node.js + Express 5
- MongoDB + Mongoose
- JWT authentication (`jsonwebtoken`)
- Validation (`joi` + custom middleware)
- Security middlewares (`cors`, rate limiting)
- Logging (`morgan`, `winston`)

### ML Service
- Python + Flask
- scikit-learn (Logistic Regression + TF-IDF)
- pandas
- pickle model artifacts
- URL/domain heuristics (`tldextract`, `whois`, `requests`)

## Project Structure

```text
Fraud-Link-Detection/
├─ client/                # React frontend
├─ server/                # Express backend
│  ├─ controllers/
│  ├─ routes/
│  ├─ middleware/
│  ├─ models/
│  ├─ services/
│  └─ validation/
├─ ml-service/            # Flask ML microservice + model artifacts
├─ mongodb-data/          # Local MongoDB data files
├─ start-backend.cmd
└─ start-backend.ps1
```

## API Overview

Base URL (backend): `http://localhost:4000/api`

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout` (auth required)

### Scanning
- `POST /scan` (auth required)
- `GET /history` (auth required)

### Presence / Real-time
- `POST /heartbeat` (auth required)

### Admin (auth + admin role required)
- `GET /admin/stats`
- `GET /admin/active-users`
- `GET /admin/health`
- `GET /admin/usage`
- `GET /admin/users`
- `GET /admin/users/:userId`
- `PUT /admin/users/:userId/role`
- `PATCH /admin/users/:userId/status`
- `DELETE /admin/users/:userId`

ML Service URL (default): `http://127.0.0.1:5000`
- `GET /health`
- `POST /predict`

## Environment Variables

### Backend (`server/.env`)

```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/fraud_detection
JWT_SECRET=replace_with_strong_secret
ML_SERVICE_URL=http://127.0.0.1:5000
ADMIN_NAME=System Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace_with_strong_password
```

### ML Service (`ml-service/.env`)

```env
GOOGLE_SAFE_BROWSING_KEY=optional_google_safe_browsing_key
```

## Local Setup

## Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB installed and running locally

### 1) Install Dependencies

Backend:
```powershell
cd server
npm install
```

Frontend:
```powershell
cd client
npm install
```

ML service:
```powershell
cd ml-service
python -m venv venv
venv\Scripts\activate
pip install flask flask-cors pandas scikit-learn python-dotenv tldextract python-whois requests
```

### 2) Train ML Model (if needed)

```powershell
cd ml-service
venv\Scripts\activate
python train_model.py
```

This generates:
- `phishing_model.pkl`
- `vectorizer.pkl`

### 3) Start Services

Terminal A (ML):
```powershell
cd ml-service
venv\Scripts\activate
python app.py
```

Terminal B (Backend):
```powershell
cd server
npm start
```

Terminal C (Frontend):
```powershell
cd client
npm run dev
```

Frontend URL: `http://localhost:5173`

## One-Command Backend Boot (Windows)

`start-backend.ps1`:
- checks MongoDB service
- starts MongoDB if needed
- runs backend server

Usage:
```powershell
./start-backend.ps1
```

## Data Models

### User
- `name`
- `email` (unique)
- `password` (hashed)
- `role` (`user` or `admin`)
- `status` (`active` or `suspended`)
- `flagged`, `flagReason`
- `createdAt`

### Scan
- `userId`
- `message`
- `category`
- `risk_score`
- `confidence_percent`
- `risk_breakdown`
- `security_analysis`
- `scannedAt`

## Security and Ops Notes

- JWT is required for user/admin APIs
- Login route uses rate limiting
- Admin routes enforce role checks
- Default admin account is protected from deletion/unsafe role changes
- Keep `.env` secrets private in production
- Move model/data artifacts and DB files out of Git for production repos

## Known Repository Notes

This repo currently contains heavy/generated files (for example `node_modules` and local MongoDB data). For long-term maintenance, add a root `.gitignore` and remove generated artifacts from version control history.

## Troubleshooting

- Backend fails to start:
  - verify `MONGO_URI` and MongoDB service
  - verify `JWT_SECRET` and `ML_SERVICE_URL`
- ML health shows down:
  - ensure `python app.py` is running on port 5000
- Empty chart/metrics:
  - generate scan traffic and confirm heartbeat requests are sent

## Future Improvements

- Add Docker Compose for all services
- Add automated tests (unit + integration)
- Add CI pipeline (lint/build/test)
- Add Redis for scalable real-time metrics
- Add model versioning and monitoring

## License

Use your preferred license (MIT/Apache-2.0/etc.) and add a `LICENSE` file at repo root.
