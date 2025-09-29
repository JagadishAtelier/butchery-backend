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
      .populate("buyer", "name email") 
      .populate("products.productId", "name price")
      .populate("claimedBy", "name email phone")
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

exports.getOrderbyuserId = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.params.userId })
      .populate("buyer", "name email") // fetch buyer name & email
      .populate("products.productId", "name price image") // ✅ include image field
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
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


// 📌 Get all unclaimed orders (for pilots)
exports.getOrdersbynotclaime = async (req, res) => {
  try {
    const orders = await Order.find({ claimedBy: null }) // ✅ only orders not yet taken
      .populate("buyer", "name email")
      .populate("products.productId", "name price")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });

    // ✅ Real-time push to pilots
    try {
      const io = req.app?.locals?.io;
      if (io) {
        io.to("pilots").emit("ordersUpdate", {
          orders: orders.map((o) => ({
            _id: o._id,
            orderId: o.orderId,
            total: o.total,
            finalAmount: o.finalAmount,
            itemsCount: o.products?.length || 0,
            createdAt: o.createdAt,
            status: o.status,
          })),
        });
      }
    } catch (emitErr) {
      console.error("Socket emit failed:", emitErr);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};



// �� Update an order status to "claimed" by a pilot
exports.claimOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.claimedBy) {
      return res.status(400).json({
        success: false,
        message: "This order is already claimed",
      });
    }

    // ✅ Claim the order
    order.claimedBy = req.pilot.id;
    order.status = "claimed";
    await order.save();

    res.json({ success: true, data: order });

    try {
      const io = req.app?.locals?.io;
      if (io) {
        io.to("pilots").emit("orderClaimed", {
          orderId: order.orderId,
          claimedBy: req.pilot.id,
        });
      }
    } catch (emitErr) {
      console.error("Socket emit failed:", emitErr);
    }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body; // pass new status in request body
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (!order.claimedBy) {
      return res.status(400).json({
        success: false,
        message: "This order is not claimed",
      });
    }

    // ✅ Update order status
    order.status = status;
    await order.save();

    res.json({ success: true, data: order });

    // ✅ Emit socket event dynamically
    try {
      const io = req.app?.locals?.io;
      if (io) {
        const eventMap = {
          "Reached Pickup Point": "orderReached",
          "Picked Up": "orderPickedUp",
          "Delivered": "orderDelivered",
        };

        if (eventMap[status]) {
          io.to("pilots").emit(eventMap[status], { orderId: order.orderId });
        }
      }
    } catch (emitErr) {
      console.error("Socket emit failed:", emitErr);
    }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};


// �� Get all completed orders (for pilots)
exports.getOrdersbypilot = async (req, res) => {
  try {
    const orders = await Order.find({ claimedBy: req.pilot.id }) 
      .populate("buyer", "name email")
      .populate("products.productId", "name price")
      .populate("claimedBy", "name email phone")
      .sort({ createdAt: -1 });
      res.json({ success: true, data: orders });
      // ✅ Real-time push to pilots
      try {
        const io = req.app?.locals?.io;
        if (io) {
          io.to("pilots").emit("ordersUpdate", {
            orders: orders.map((o) => ({
              _id: o._id,
              orderId: o.orderId,
              total: o.total,
              finalAmount: o.finalAmount,
              itemsCount: o.products?.length || 0,
              createdAt: o.createdAt,
              status: o.status,
            })),
          });
        }
      } catch (emitErr) {
        console.error("Socket emit failed:", emitErr);
      }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
