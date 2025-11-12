const request = require('supertest');
const app = require('../app');
const { supabase } = require('../config/database');

describe('Posts API', () => {
  let accessToken;
  let userId;
  let postId;
  const testEmail = `posttest${Date.now()}@moodcircle.test`;
  
  beforeAll(async () => {
    await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ email: testEmail });
    
    const { data: otpData } = await supabase
      .from('otp_codes')
      .select('otp')
      .eq('email', testEmail)
      .single();
    
    const authResponse = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email: testEmail, otp: otpData.otp });
    
    accessToken = authResponse.body.tokens.accessToken;
    userId = authResponse.body.user.id;
  });
  
  afterAll(async () => {
    await supabase.from('posts').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('email', testEmail);
  });
  
  describe('POST /api/v1/posts', () => {
    it('should create post with mood', async () => {
      const response = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Feeling amazing today!',
          mood: 'joy'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.post).toHaveProperty('id');
      expect(response.body.post.mood).toBe('joy');
      
      postId = response.body.post.id;
    });
    
    it('should create post with auto-detected mood', async () => {
      const response = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'I am so sad and lonely today'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.post.mood).toBeDefined();
      expect(response.body.post.moodConfidence).toBeDefined();
    });
    
    it('should reject empty content', async () => {
      const response = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: ''
        });
      
      expect(response.status).toBe(400);
    });
    
    it('should reject content over 2000 characters', async () => {
      const longContent = 'a'.repeat(2001);
      const response = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: longContent
        });
      
      expect(response.status).toBe(400);
    });
    
    it('should reject unauthorized request', async () => {
      const response = await request(app)
        .post('/api/v1/posts')
        .send({
          content: 'Test post'
        });
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/v1/posts', () => {
    it('should fetch all posts with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/posts')
        .query({ page: 1, limit: 10 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.posts).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('total');
    });
  });
  
  describe('GET /api/v1/posts/mood/:mood', () => {
    it('should fetch posts by mood', async () => {
      const response = await request(app)
        .get('/api/v1/posts/mood/joy')
        .query({ page: 1, limit: 10 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.posts).toBeInstanceOf(Array);
    });
    
    it('should reject invalid mood', async () => {
      const response = await request(app)
        .get('/api/v1/posts/mood/invalid');
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('GET /api/v1/posts/:id', () => {
    it('should fetch specific post', async () => {
      const response = await request(app)
        .get(`/api/v1/posts/${postId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.post.id).toBe(postId);
    });
    
    it('should return 404 for non-existent post', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/posts/${fakeId}`);
      
      expect(response.status).toBe(404);
    });
  });
});