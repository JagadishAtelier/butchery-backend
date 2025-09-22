const axios = require("axios");

const instance = axios.create({
  baseURL: process.env.SHIPROCKET_API,
  headers: { "Content-Type": "application/json" },
});

module.exports = instance;
