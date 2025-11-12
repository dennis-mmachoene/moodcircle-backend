const { verifyAccessToken } = require('../utils/jwt');
const logger = require('../config/logger');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'NO_TOKEN'
      });
    }
    
    const decoded = verifyAccessToken(token);
    
    req.user = {
      userId: decoded.userId
    };
    
    next();
  } catch (error) {
    logger.warn(`Authentication failed: ${error.message}`);
    
    if (error.message === 'ACCESS_TOKEN_EXPIRED') {
      return res.status(401).json({
        success: false,
        message: 'Access token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(403).json({
      success: false,
      message: 'Invalid access token',
      code: 'INVALID_TOKEN'
    });
  }
};

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = verifyAccessToken(token);
      req.user = {
        userId: decoded.userId
      };
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};