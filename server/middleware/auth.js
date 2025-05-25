const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // For /me endpoint, require authentication
      if (req.path === '/api/auth/me') {
        return res.status(401).json({ error: 'Please authenticate' });
      }
      // Allow guest access for other public routes
      req.user = { role: 'guest' };
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        throw new Error('User not found');
      }

      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      // For /me endpoint or protected routes, return 401
      if (req.path === '/api/auth/me' || req.path.startsWith('/api/protected')) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      // For other public routes, continue as guest
      req.user = { role: 'guest' };
      next();
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to require authentication
const requireAuth = (req, res, next) => {
  if (req.user.role === 'guest') {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Middleware to require editor role
const requireEditor = (req, res, next) => {
  if (req.user.role !== 'editor') {
    return res.status(403).json({ error: 'Editor access required' });
  }
  next();
};

module.exports = { auth, requireAuth, requireEditor }; 