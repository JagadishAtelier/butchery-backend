const Visitor = require("../models/Visitor");

const trackVisitor = async (req, res, next) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    const alreadyVisited = await Visitor.findOne({
      ipAddress: ip,
      visitedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // last 24h
    });

    if (!alreadyVisited) {
      await Visitor.create({ ipAddress: ip });
    }
  } catch (err) {
    console.error("Visitor tracking error:", err.message);
  }
  next();
};

module.exports = trackVisitor;
