const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const productRoutes = require("./Router/productRoutes");
const orderRoutes = require("./Router/orderRoutes");
const analyticsRoutes = require("./Router/analyticsRoutes");
const campaignRoutes = require("./Router/campaignRoutes");
const shiprocketRoutes = require("./Router/shiprocketRoutes");
const authRoutes = require("./Router/authRoutes")
const categoryRoutes = require("./Router/categoryRoutes");
const shippingAnalyticsRoutes = require("./Router/shippingAnalyticsRoutes");
const cartRoutes = require('./Router/cartRoutes')
const dashboardRoutes = require('./Router/dashboardRoutes')
const cors = require("cors")
const app = express();
require("dotenv").config();



// Middleware
app.use(express.json());
app.use(cors({
  origin: "*",  // allows requests from any domain
  credentials: true, // optional: only needed if you use cookies or auth headers
}));
app.use(morgan('dev'));
// Routes
app.use("/api/categories", categoryRoutes);

app.use('/api/auth', authRoutes);
app.use("/api/analytics", shippingAnalyticsRoutes);
app.use("/api/shiprocket", shiprocketRoutes);
app.use("/api/products", productRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/dashboard",dashboardRoutes);

module.exports = app;
