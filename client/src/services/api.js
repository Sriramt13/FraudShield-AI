import axios from "axios";

const RENDER_BACKEND_ORIGIN = "https://server-208e.onrender.com";
const envBase = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = (envBase || RENDER_BACKEND_ORIGIN).replace(/\/+$/, "");
const API_BASE_WITH_PREFIX = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

const API = axios.create({
  baseURL: API_BASE_WITH_PREFIX,
  headers: {
    "Content-Type": "application/json"
  }
});

API.interceptors.request.use((req) => {

  const token = sessionStorage.getItem("token");

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;

});

export default API;