const Campaign = require('../Model/Campaign');
const Cart = require('../Model/Cart');
const Category = require('../Model/categoryModel');
const Order = require('../Model/Order');
const Product = require('../Model/ProductModel');
const ShiprocketToken = require('../Model/ShiprocketToken');
const User = require('../Model/User');
const Visitor = require('../Model/Visitor');

const MILLIS_IN_DAY = 24 * 60 * 60 * 1000;

async function getDashboard(req, res) {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last30Days = new Date(now.getTime() - 30 * MILLIS_IN_DAY);
    const last7Days = new Date(now.getTime() - 7 * MILLIS_IN_DAY);

    // Run independent queries in parallel for speed
    const [
      totalUsers,
      newUsers30,
      totalOrders,
      ordersByStatusAgg,
      revenueAgg,
      revenue30Agg,
      recentOrders,
      topProductsAgg,
      lowStockProducts,
      activeCampaigns,
      visitorsToday,
      visitorsLast7,
      cartsAbandoned,
      categoriesCount,
      productsCount,
      shiprocketToken,
      revenueByDayAgg
    ] = await Promise.all([
      // Users
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: last30Days } }),

      // Orders
      Order.countDocuments(),

      // Orders by status
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Total revenue (only Paid orders)
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } }
      ]),

      // Revenue last 30 days (Paid)
      Order.aggregate([
        { $match: { paymentStatus: 'Paid', createdAt: { $gte: last30Days } } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } }
      ]),

      // Recent orders (latest 10)
      Order.find().sort({ createdAt: -1 }).limit(10).populate('buyer', 'name email').lean(),

      // Top selling products (by quantity) with lookup to Product
      Order.aggregate([
        { $unwind: '$products' },
        { $group: {
          _id: '$products.productId',
          quantitySold: { $sum: { $ifNull: ['$products.quantity', 1] } },
          revenue: { $sum: { $multiply: [ { $ifNull: ['$products.quantity', 1] }, { $ifNull: ['$products.price', 0] } ] } }
        } },
        { $sort: { quantitySold: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, productId: '$_id', name: '$product.name', productKey: '$product.productId', image: { $arrayElemAt: ['$product.images', 0] }, quantitySold: 1, revenue: 1 } }
      ]),

      // Low stock products (total stock across weightOptions <= 10)
      Product.aggregate([
        { $addFields: { totalStock: { $sum: { $map: { input: '$weightOptions', as: 'wo', in: { $ifNull: ['$$wo.stock', 0] } } } } } },
        { $match: { totalStock: { $lte: 10 } } },
        { $project: { name: 1, productId: 1, totalStock: 1, image: { $arrayElemAt: ['$images', 0] } } },
        { $limit: 15 }
      ]),

      // Active campaigns
      Campaign.find({ status: 'Active' }).lean(),

      // Visitors today
      Visitor.countDocuments({ visitedAt: { $gte: startOfToday } }),

      // Visitors in last 7 days (total)
      Visitor.countDocuments({ visitedAt: { $gte: last7Days } }),

      // Abandoned carts: carts with items and not updated in last 24 hours
      Cart.countDocuments({ items: { $exists: true, $ne: [] }, updatedAt: { $lte: new Date(now.getTime() - MILLIS_IN_DAY) } }),

      // Counts for categories & products
      Category.countDocuments(),
      Product.countDocuments(),

      // Shiprocket token (latest)
      ShiprocketToken.findOne().sort({ expiresAt: -1 }).lean(),

      // Revenue by day for last 30 days (for chart)
      Order.aggregate([
        { $match: { paymentStatus: 'Paid', createdAt: { $gte: last30Days } } },
        { $project: { day: { $dateToString: { format: "%Y-%m-%d", date: '$createdAt' } }, amount: '$finalAmount' } },
        { $group: { _id: '$day', total: { $sum: '$amount' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Compute ordersByStatus map
    const ordersByStatus = ordersByStatusAgg.reduce((acc, cur) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});

    // revenue extraction
    const totalRevenue = (revenueAgg[0] && revenueAgg[0].total) || 0;
    const revenueLast30 = (revenue30Agg[0] && revenue30Agg[0].total) || 0;

    // Average order value (use paid orders count to be meaningful)
    const paidOrdersCountAgg = await Order.countDocuments({ paymentStatus: 'Paid' });
    const averageOrderValue = paidOrdersCountAgg > 0 ? totalRevenue / paidOrdersCountAgg : 0;

    // Campaign performance: augment each active campaign with basic computed fields (if any)
    const campaignPerformance = activeCampaigns.map((c) => ({
      _id: c._id,
      name: c.name,
      status: c.status,
      budget: c.budget,
      spent: c.spent,
      ctr: c.ctr || 0,
      conversions: c.conversions || 0,
      startDate: c.startDate,
      endDate: c.endDate,
      platforms: c.platforms,
      targetType: c.targetType,
      discount: { type: c.discountType, value: c.discountValue },
      audience: c.audience
    }));

    // Visitors by day for last 7 days
    const visitorsByDay = await Visitor.aggregate([
      { $match: { visitedAt: { $gte: last7Days } } },
      { $project: { day: { $dateToString: { format: "%Y-%m-%d", date: '$visitedAt' } } } },
      { $group: { _id: '$day', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Format revenueByDay for the chart
    const revenueByDay = revenueByDayAgg.map((r) => ({ day: r._id, total: r.total, orders: r.orders }));

    // Build final response
    const payload = {
      stats: {
        totalUsers,
        newUsersLast30: newUsers30,
        totalOrders,
        ordersByStatus,
        totalRevenue,
        revenueLast30,
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        categoriesCount,
        productsCount,
        abandonedCarts: cartsAbandoned,
        visitors: {
          today: visitorsToday,
          last7Days: visitorsLast7,
          byDay: visitorsByDay
        }
      },
      topSellingProducts: topProductsAgg,
      lowStockProducts,
      campaignPerformance,
      recentOrders,
      shiprocketToken,
      graphs: {
        revenueByDay // array of { day: 'YYYY-MM-DD', total: Number, orders: Number }
      }
    };

    return res.json({ success: true, data: payload });
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
}

module.exports = {
  getDashboard
};