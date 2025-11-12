const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const postService = require('../services/postService');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { postLimiter } = require('../middleware/rateLimiter');
const { supabase } = require('../config/database');
const config = require('../config/env');
const {
  validatePostContent,
  validateMood,
  validatePagination,
  validateUUID,
  handleValidationErrors
} = require('../utils/validation');
const { sanitizeFilename } = require('../utils/sanitization');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSizeMB * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (config.upload.allowedAudioFormats.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Only ${config.upload.allowedAudioFormats.join(', ')} files are allowed`));
    }
  }
});

router.post(
  '/',
  authenticateToken,
  postLimiter,
  upload.single('voice'),
  [validatePostContent(), validateMood()],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { content, mood } = req.body;
      let voiceUrl = null;
      
      if (req.file) {
        const fileName = `${uuidv4()}-${sanitizeFilename(req.file.originalname)}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('voice-posts')
          .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
          });
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('voice-posts')
          .getPublicUrl(fileName);
        
        voiceUrl = urlData.publicUrl;
      }
      
      const result = await postService.createPost(
        req.user.userId,
        content,
        mood,
        voiceUrl
      );
      
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/',
  optionalAuth,
  validatePagination(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const userId = req.user?.userId;
      
      const result = await postService.getAllPosts(page, limit, userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/mood/:mood',
  optionalAuth,
  validatePagination(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { mood } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const userId = req.user?.userId;
      
      const validMoods = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'love', 'neutral'];
      if (!validMoods.includes(mood)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mood type',
          code: 'INVALID_MOOD'
        });
      }
      
      const result = await postService.getPostsByMood(mood, page, limit, userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  optionalAuth,
  validateUUID(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      
      const result = await postService.getPost(id, userId);
      res.json(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Post not found or expired',
          code: 'POST_NOT_FOUND'
        });
      }
      next(error);
    }
  }
);

module.exports = router;