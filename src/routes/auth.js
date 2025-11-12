const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');
const { 
  validateEmail, 
  validateOTP, 
  handleValidationErrors 
} = require('../utils/validation');

router.post(
  '/request-otp',
  otpLimiter,
  validateEmail(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const result = await authService.requestOTP(email);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/verify-otp',
  authLimiter,
  [validateEmail(), validateOTP()],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyOTP(email, otp);
      res.json(result);
    } catch (error) {
      if (error.message.includes('Invalid or expired')) {
        return res.status(401).json({
          success: false,
          message: error.message,
          code: 'INVALID_OTP'
        });
      }
      next(error);
    }
  }
);

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN'
      });
    }
    
    const result = await authService.refreshAccessToken(refreshToken);
    res.json(result);
  } catch (error) {
    if (error.message.includes('INVALID') || error.message.includes('EXPIRED')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    next(error);
  }
});

router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN'
      });
    }
    
    const result = await authService.logout(refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/logout-all', authenticateToken, async (req, res, next) => {
  try {
    const result = await authService.logoutAll(req.user.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    userId: req.user.userId
  });
});

module.exports = router;