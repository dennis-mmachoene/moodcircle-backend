const { body, param, query, validationResult } = require('express-validator');

const validateEmail = () => {
  return body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required');
};

const validateOTP = () => {
  return body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 6 digits');
};

const validatePostContent = () => {
  return body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Content must be between 1 and 2000 characters');
};

const validateMood = () => {
  return body('mood')
    .optional()
    .isIn(['joy', 'sadness', 'anger', 'fear', 'surprise', 'love', 'neutral'])
    .withMessage('Invalid mood type');
};

const validateReaction = () => {
  return body('reactionType')
    .isIn(['stay_strong', 'same_here', 'sending_love', 'grateful', 'understood'])
    .withMessage('Invalid reaction type');
};

const validatePagination = () => {
  return [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ];
};

const validateUUID = (field = 'id') => {
  return param(field)
    .isUUID()
    .withMessage(`${field} must be a valid UUID`);
};

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

module.exports = {
  validateEmail,
  validateOTP,
  validatePostContent,
  validateMood,
  validateReaction,
  validatePagination,
  validateUUID,
  handleValidationErrors
};