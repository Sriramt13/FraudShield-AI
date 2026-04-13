import axios from "axios";

export const callMLService = async (message, mlUrl) => {
  if (!mlUrl) {
    throw new Error("ML_SERVICE_URL is not configured");
  }

  const normalizedUrl = mlUrl.replace(/\/+$/, "");

  const response = await axios.post(`${normalizedUrl}/predict`, { message }, { timeout: 30000 });

  return response.data;
};