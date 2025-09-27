const axios = require("../utils/shiprocketAxios");
const ShiprocketToken = require("../Model/ShiprocketToken");

const authShiprocket = async () => {
  const { data } = await axios.post("/v1/external/auth/login", {
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  });

  const expiresAt = new Date(Date.now() + 86400 * 1000); // token valid for 24h
  await ShiprocketToken.findOneAndUpdate({}, { token: data.token, expiresAt }, { upsert: true });
  return data.token;
};

const getValidToken = async () => {
  const saved = await ShiprocketToken.findOne();
  if (saved && saved.expiresAt > new Date()) return saved.token;
  return await authShiprocket();
};

const shiprocketRequest = async (method, url, payload = {}) => {
  const token = await getValidToken();
  return await axios({
    method,
    url,
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });
};

module.exports = {
  authShiprocket,
  getValidToken,
  shiprocketRequest,
};
