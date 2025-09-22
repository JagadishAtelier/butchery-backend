const Order = require("../Model/Order");

// 📌 Create a new order
exports.createOrder = async (req, res) => {
  try {
    // Ensure unique order id (optional: you can generate a unique ID if not provided)
    if (!req.body.id) {
      req.body.id = `ORD${Date.now()}`;
    }

    // Calculate finalAmount if not provided
    if (!req.body.finalAmount) {
      req.body.finalAmount = (req.body.total || 0) - (req.body.discount || 0);
    }

    const order = await Order.create(req.body);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// 📌 Get all orders
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("buyer", "name email") // fetch buyer name & email
      .populate("products.productId", "name price") // fetch product name & price
      .sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 📌 Get a single order by ID
exports.getOrderById = async (req, res) => {
  try {
    // Use findById instead of findOne
    const order = await Order.findById(req.params.id)
      .populate("buyer", "name email")
      .populate("products.productId", "name price");

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 📌 Update an order by ID
exports.updateOrder = async (req, res) => {
  try {
    // If updating total or discount, recalculate finalAmount
    if (req.body.total || req.body.discount) {
      req.body.finalAmount = (req.body.total || 0) - (req.body.discount || 0);
    }

    const order = await Order.findOneAndUpdate({ id: req.params.id }, req.body, {
      new: true,
    })
      .populate("buyer", "name email")
      .populate("products.productId", "name price");

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// 📌 Delete an order by ID
exports.deleteOrder = async (req, res) => {
  try {
    // Use findByIdAndDelete instead of findOneAndDelete
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    res.json({ success: true, message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
