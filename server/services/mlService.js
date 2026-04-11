import axios from "axios";

export const callMLService = async (message, mlUrl) => {
  const response = await axios.post(
    `${mlUrl}/predict`,
    { message },
    { timeout: 30000 }
  );

  return response.data;
};