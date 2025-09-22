const Order = require("../Model/Order");

exports.getShippingOverview = async (req, res) => {
  try {
    const total = await Order.countDocuments({ shipped: true });

    const deliveredOrders = await Order.find({ status: "Delivered" });
    const avgDeliveryTime =
      deliveredOrders.reduce((acc, o) => {
        const pickup = new Date(o.pickupDate);
        const delivery = new Date(o.deliveryDate);
        const diff = (delivery - pickup) / (1000 * 60 * 60 * 24);
        return acc + diff;
      }, 0) / (deliveredOrders.length || 1);

    const rtoCount = await Order.countDocuments({ status: "RTO" });

    res.json({
      totalShipped: total,
      averageDeliveryTime: avgDeliveryTime.toFixed(2),
      rtoRate: ((rtoCount / total) * 100).toFixed(2) + "%",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCourierPerformance = async (req, res) => {
  try {
    const couriers = await Order.aggregate([
      { $match: { shipped: true } },
      {
        $group: {
          _id: "$courierName",
          total: { $sum: 1 },
          delivered: {
            $sum: {
              $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0],
            },
          },
          rto: {
            $sum: {
              $cond: [{ $eq: ["$status", "RTO"] }, 1, 0],
            },
          },
        },
      },
    ]);

    res.json(
      couriers.map((c) => ({
        courier: c._id,
        total: c.total,
        delivered: c.delivered,
        rto: c.rto,
        deliveryRate: ((c.delivered / c.total) * 100).toFixed(2),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRegionStats = async (req, res) => {
  try {
    const data = await Order.aggregate([
      { $match: { shipped: true } },
      {
        $group: {
          _id: "$shippingAddress.city",
          count: { $sum: 1 },
        },
      },
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getShipmentTrends = async (req, res) => {
  try {
    const data = await Order.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$shipmentDate" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id": 1 } },
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
