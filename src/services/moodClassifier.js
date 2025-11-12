const axios = require('axios');
const config = require('../config/env');
const logger = require('../config/logger');

const MOOD_MAPPING = {
  'joy': 'joy',
  'happiness': 'joy',
  'sadness': 'sadness',
  'anger': 'anger',
  'fear': 'fear',
  'surprise': 'surprise',
  'love': 'love',
  'disgust': 'anger',
  'neutral': 'neutral'
};

const classifyMood = async (text) => {
  try {
    if (!config.ml.huggingfaceApiKey) {
      logger.warn('HuggingFace API key not configured, using fallback');
      return fallbackMoodClassifier(text);
    }
    
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${config.ml.model}`,
      { inputs: text },
      {
        headers: {
          'Authorization': `Bearer ${config.ml.huggingfaceApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    if (!response.data || !response.data[0]) {
      throw new Error('Invalid response from ML model');
    }
    
    const predictions = response.data[0];
    const topPrediction = predictions.reduce((prev, current) => 
      (prev.score > current.score) ? prev : current
    );
    
    const detectedMood = MOOD_MAPPING[topPrediction.label.toLowerCase()] || 'neutral';
    const confidence = topPrediction.score;
    
    logger.info(`Mood classified: ${detectedMood} (${(confidence * 100).toFixed(1)}%)`);
    
    return {
      mood: detectedMood,
      confidence: confidence,
      raw: topPrediction.label
    };
  } catch (error) {
    logger.error('ML mood classification failed:', error.message);
    
    if (error.response?.status === 503) {
      logger.info('ML model loading, using fallback');
      return fallbackMoodClassifier(text);
    }
    
    return fallbackMoodClassifier(text);
  }
};

const fallbackMoodClassifier = (text) => {
  const lowerText = text.toLowerCase();
  
  const patterns = {
    joy: ['happy', 'excited', 'great', 'amazing', 'wonderful', 'joy', 'love', 'blessed', '😊', '😄', '🎉', '❤️'],
    sadness: ['sad', 'depressed', 'lonely', 'hurt', 'crying', 'miss', 'lost', 'empty', '😢', '😭', '💔'],
    anger: ['angry', 'furious', 'mad', 'hate', 'annoyed', 'frustrated', 'pissed', '😠', '😡', '🤬'],
    fear: ['scared', 'afraid', 'worried', 'anxious', 'panic', 'terrified', 'nervous', '😰', '😨'],
    surprise: ['wow', 'omg', 'shocked', 'unexpected', 'surprised', 'amazing', '😲', '😮'],
    love: ['love', 'adore', 'cherish', 'care', 'affection', 'sweetheart', '❤️', '💕', '🥰']
  };
  
  const scores = {};
  
  for (const [mood, keywords] of Object.entries(patterns)) {
    let score = 0;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        score += matches.length;
      }
    });
    scores[mood] = score;
  }
  
  const maxScore = Math.max(...Object.values(scores));
  
  if (maxScore === 0) {
    return {
      mood: 'neutral',
      confidence: 0.5,
      raw: 'neutral (fallback)'
    };
  }
  
  const detectedMood = Object.keys(scores).find(mood => scores[mood] === maxScore);
  
  const totalWords = text.split(/\s+/).length;
  const confidence = Math.min(0.85, (maxScore / totalWords) * 2);
  
  logger.info(`Fallback mood classified: ${detectedMood} (${(confidence * 100).toFixed(1)}%)`);
  
  return {
    mood: detectedMood,
    confidence: Math.max(0.4, confidence),
    raw: `${detectedMood} (fallback)`
  };
};

const validateMood = (mood) => {
  const validMoods = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'love', 'neutral'];
  return validMoods.includes(mood);
};

module.exports = {
  classifyMood,
  fallbackMoodClassifier,
  validateMood
};