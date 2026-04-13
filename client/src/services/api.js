import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://server-208e.onrender.com";

const API = axios.create({
  baseURL: `${API_BASE}/api`,
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