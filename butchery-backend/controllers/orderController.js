// controllers/orderController.js
const Order = require("../Model/Order");

const populateOrder = (query) =>
  query
    .populate("buyer", "name email")
    .populate("products.productId", "name price image")
    .lean();


exports.createOrder = async (req, res) => {
  try {
    // Remove any client-sent id to avoid conflicts
    delete req.body.id;

    // Ensure finalAmount is calculated if not provided
    if (!req.body.finalAmount) {
      req.body.finalAmount = (req.body.total || 0) - (req.body.discount || 0);
    }

    const order = await Order.create(req.body);

    // Return populated order (with product images and buyer)
    const populated = await populateOrder(Order.findById(order._id));
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error("createOrder error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await populateOrder(
      Order.find().sort({ createdAt: -1 })
    );
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error("getOrders error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Get single order by ID
 */
exports.getOrderById = async (req, res) => {
  try {
    const order = await populateOrder(Order.findById(req.params.id));

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    res.json({ success: true, data: order });
  } catch (err) {
    console.error("getOrderById error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.updateOrder = async (req, res) => {
  try {
    // Recalculate finalAmount if total or discount provided
    if (req.body.total !== undefined || req.body.discount !== undefined) {
      req.body.finalAmount = (req.body.total || 0) - (req.body.discount || 0);
    }

    // Support ping update in same endpoint (optional)
    if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
      const lat = Number(req.body.latitude);
      const lng = Number(req.body.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        req.body.pingLocation = { type: "Point", coordinates: [lng, lat] };
        req.body.pingedAt = new Date();
      }
      // Remove values so Mongoose doesn't try to set unknown fields directly
      delete req.body.latitude;
      delete req.body.longitude;
    } else if (Array.isArray(req.body.coordinates) && req.body.coordinates.length === 2) {
      // allow passing coordinates directly [lng, lat]
      req.body.pingLocation = { type: "Point", coordinates: req.body.coordinates };
      req.body.pingedAt = new Date();
      delete req.body.coordinates;
    }

    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    const populated = await populateOrder(Order.findById(order._id));
    res.json({ success: true, data: populated });
  } catch (err) {
    console.error("updateOrder error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
};


exports.updateOrderPing = async (req, res) => {
  try {
    const { latitude, longitude, coordinates } = req.body;

    let coords;
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      coords = coordinates; // assume [lng, lat]
    } else if (typeof latitude === "number" && typeof longitude === "number") {
      coords = [longitude, latitude];
    } else if (!isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
      coords = [Number(longitude), Number(latitude)];
    } else {
      return res.status(400).json({
        success: false,
        message: "Provide latitude & longitude (numbers) or coordinates [lng,lat]",
      });
    }

    const update = {
      pingLocation: { type: "Point", coordinates: coords },
      pingedAt: new Date(),
    };


    const updated = await Order.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Order not found" });

    const populated = await populateOrder(Order.findById(updated._id));
    return res.json({ success: true, data: populated });
  } catch (err) {
    console.error("updateOrderPing error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getOrderbyuserId = async (req, res) => {
  try {
    const orders = await populateOrder(
      Order.find({ buyer: req.params.userId }).sort({ createdAt: -1 })
    );

    res.json({ success: true, data: orders });
  } catch (err) {
    console.error("getOrderbyuserId error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    res.json({ success: true, message: "Order deleted successfully" });
  } catch (err) {
    console.error("deleteOrder error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
