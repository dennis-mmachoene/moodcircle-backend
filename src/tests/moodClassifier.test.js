const { classifyMood, fallbackMoodClassifier, validateMood } = require('../services/moodClassifier');

describe('Mood Classifier Service', () => {
  describe('classifyMood', () => {
    it('should classify happy text', async () => {
      const result = await classifyMood('I am so happy and excited today!');
      
      expect(result).toHaveProperty('mood');
      expect(result).toHaveProperty('confidence');
      expect(result.mood).toBe('joy');
      expect(result.confidence).toBeGreaterThan(0);
    }, 15000);
    
    it('should classify sad text', async () => {
      const result = await classifyMood('I feel so sad and lonely');
      
      expect(result).toHaveProperty('mood');
      expect(result.mood).toBe('sadness');
    }, 15000);
    
    it('should handle neutral text', async () => {
      const result = await classifyMood('The meeting is at 3pm');
      
      expect(result).toHaveProperty('mood');
      expect(['neutral', 'joy', 'sadness']).toContain(result.mood);
    }, 15000);
  });
  
  describe('fallbackMoodClassifier', () => {
    it('should detect joy from keywords', () => {
      const result = fallbackMoodClassifier('I am so happy and excited!');
      
      expect(result.mood).toBe('joy');
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it('should detect sadness from keywords', () => {
      const result = fallbackMoodClassifier('I am depressed and crying');
      
      expect(result.mood).toBe('sadness');
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it('should detect anger from keywords', () => {
      const result = fallbackMoodClassifier('I am so angry and furious');
      
      expect(result.mood).toBe('anger');
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it('should detect fear from keywords', () => {
      const result = fallbackMoodClassifier('I am scared and terrified');
      
      expect(result.mood).toBe('fear');
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it('should detect love from keywords', () => {
      const result = fallbackMoodClassifier('I love you so much');
      
      expect(result.mood).toBe('love');
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it('should default to neutral for ambiguous text', () => {
      const result = fallbackMoodClassifier('The weather is normal');
      
      expect(result.mood).toBe('neutral');
    });
    
    it('should handle emojis', () => {
      const result = fallbackMoodClassifier('Today was great 😊🎉');
      
      expect(result.mood).toBe('joy');
    });
  });
  
  describe('validateMood', () => {
    it('should validate correct moods', () => {
      expect(validateMood('joy')).toBe(true);
      expect(validateMood('sadness')).toBe(true);
      expect(validateMood('anger')).toBe(true);
      expect(validateMood('fear')).toBe(true);
      expect(validateMood('surprise')).toBe(true);
      expect(validateMood('love')).toBe(true);
      expect(validateMood('neutral')).toBe(true);
    });
    
    it('should reject invalid moods', () => {
      expect(validateMood('invalid')).toBe(false);
      expect(validateMood('happiness')).toBe(false);
      expect(validateMood('')).toBe(false);
    });
  });
});