const jwt = require('jsonwebtoken');
const User = require('../Model/User');

const JWT_SECRET = process.env.JWT_SECRET || '0c076c0ff886213a14bb446d72ef0658b254d';

// Protect middleware
exports.protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.userId).select('-password');
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Role restriction middleware
exports.restrictToRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission' });
    }
    next();
  };
};
