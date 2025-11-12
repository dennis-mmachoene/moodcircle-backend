const express = require('express');
const router = express.Router();
const reactionService = require('../services/reactionService');
const { authenticateToken } = require('../middleware/auth');
const {
  validateReaction,
  validateUUID,
  handleValidationErrors
} = require('../utils/validation');

router.post(
  '/:postId',
  authenticateToken,
  [validateUUID('postId'), validateReaction()],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { postId } = req.params;
      const { reactionType } = req.body;
      
      const result = await reactionService.addReaction(
        req.user.userId,
        postId,
        reactionType
      );
      
      res.json(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Post not found or expired',
          code: 'POST_NOT_FOUND'
        });
      }
      if (error.message.includes('Invalid reaction')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_REACTION'
        });
      }
      next(error);
    }
  }
);

router.delete(
  '/:postId',
  authenticateToken,
  validateUUID('postId'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { postId } = req.params;
      
      const result = await reactionService.removeReaction(
        req.user.userId,
        postId
      );
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:postId',
  validateUUID('postId'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { postId } = req.params;
      const result = await reactionService.getPostReactions(postId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:postId/user',
  authenticateToken,
  validateUUID('postId'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { postId } = req.params;
      const result = await reactionService.getUserReaction(
        req.user.userId,
        postId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;