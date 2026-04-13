import axios from "axios";

export const callMLService = async (message, mlUrl) => {
  if (!mlUrl) {
    throw new Error("ML_SERVICE_URL is not configured");
  }

  const normalizedUrl = mlUrl.replace(/\/+$/, "");
  const predictUrl = normalizedUrl.endsWith("/predict") ? normalizedUrl : `${normalizedUrl}/predict`;

  const response = await axios.post(predictUrl, { message }, { timeout: 30000 });

  return response.data;
};