exports.getTopSellingProducts = async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;

  try {
    const topProducts = await Order.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          totalSold: { $sum: "$products.quantity" }
        }
      },
      {
        $sort: { totalSold: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      {
        $unwind: "$product"
      },
      {
        $project: {
          name: "$product.name",
          totalSold: 1,
          price: "$product.price",
          image: { $arrayElemAt: ["$product.images", 0] }
        }
      }
    ]);

    res.json({ success: true, data: topProducts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};



exports.getSalesSummary = async (req, res) => {
  try {
    const now = new Date();
    const firstDayOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [lastMonth, thisMonth] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            paymentDate: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth },
            status: "Completed"
          }
        },
        { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        {
          $match: {
            paymentDate: { $gte: firstDayOfThisMonth },
            status: "Completed"
          }
        },
        { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        thisMonth: thisMonth[0] || { total: 0, count: 0 },
        lastMonth: lastMonth[0] || { total: 0, count: 0 }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getUniqueVisitors = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await Visitor.distinct("ipAddress", {
      visitedAt: { $gte: today }
    });

    res.json({ success: true, count: count.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
