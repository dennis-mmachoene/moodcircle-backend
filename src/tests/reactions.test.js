const request = require('supertest');
const app = require('../app');
const { supabase } = require('../config/database');

describe('Reactions API', () => {
  let accessToken;
  let userId;
  let postId;
  const testEmail = `reactiontest${Date.now()}@moodcircle.test`;
  
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
    
    const postResponse = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: 'Test post for reactions',
        mood: 'joy'
      });
    
    postId = postResponse.body.post.id;
  });
  
  afterAll(async () => {
    await supabase.from('reactions').delete().eq('user_id', userId);
    await supabase.from('posts').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('email', testEmail);
  });
  
  describe('POST /api/v1/reactions/:postId', () => {
    it('should add reaction to post', async () => {
      const response = await request(app)
        .post(`/api/v1/reactions/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reactionType: 'stay_strong' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe('added');
      expect(response.body.reactionType).toBe('stay_strong');
    });
    
    it('should update reaction when reacting again with different type', async () => {
      const response = await request(app)
        .post(`/api/v1/reactions/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reactionType: 'same_here' });
      
      expect(response.status).toBe(200);
      expect(response.body.action).toBe('updated');
      expect(response.body.reactionType).toBe('same_here');
    });
    
    it('should remove reaction when reacting again with same type', async () => {
      const response = await request(app)
        .post(`/api/v1/reactions/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reactionType: 'same_here' });
      
      expect(response.status).toBe(200);
      expect(response.body.action).toBe('removed');
      expect(response.body.reactionType).toBeNull();
    });
    
    it('should reject invalid reaction type', async () => {
      const response = await request(app)
        .post(`/api/v1/reactions/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reactionType: 'invalid_reaction' });
      
      expect(response.status).toBe(400);
    });
    
    it('should reject unauthorized request', async () => {
      const response = await request(app)
        .post(`/api/v1/reactions/${postId}`)
        .send({ reactionType: 'stay_strong' });
      
      expect(response.status).toBe(401);
    });
    
    it('should return 404 for non-existent post', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/v1/reactions/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reactionType: 'stay_strong' });
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('GET /api/v1/reactions/:postId', () => {
    beforeAll(async () => {
      await request(app)
        .post(`/api/v1/reactions/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reactionType: 'sending_love' });
    });
    
    it('should fetch reaction counts for post', async () => {
      const response = await request(app)
        .get(`/api/v1/reactions/${postId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.reactions).toHaveProperty('total');
      expect(response.body.reactions).toHaveProperty('breakdown');
    });
  });
  
  describe('GET /api/v1/reactions/:postId/user', () => {
    it('should fetch user reaction for post', async () => {
      const response = await request(app)
        .get(`/api/v1/reactions/${postId}/user`)
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.reaction).toBeDefined();
    });
    
    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/reactions/${postId}/user`);
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('DELETE /api/v1/reactions/:postId', () => {
    it('should remove reaction from post', async () => {
      const response = await request(app)
        .delete(`/api/v1/reactions/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});