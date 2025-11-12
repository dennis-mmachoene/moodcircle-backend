const request = require('supertest');
const app = require('../app');
const { supabase } = require('../config/database');

describe('Authentication API', () => {
  const testEmail = `test${Date.now()}@moodcircle.test`;
  let otpCode;
  let accessToken;
  let refreshToken;
  
  afterAll(async () => {
    await supabase.from('users').delete().eq('email', testEmail);
  });
  
  describe('POST /api/v1/auth/request-otp', () => {
    it('should request OTP for valid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ email: testEmail });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Verification code sent');
    });
    
    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ email: 'invalid-email' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    it('should enforce rate limiting', async () => {
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/v1/auth/request-otp')
          .send({ email: `rate${i}@test.com` });
      }
      
      const response = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ email: 'ratelimit@test.com' });
      
      expect(response.status).toBe(429);
    }, 15000);
  });
  
  describe('POST /api/v1/auth/verify-otp', () => {
    beforeAll(async () => {
      await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ email: testEmail });
      
      const { data } = await supabase
        .from('otp_codes')
        .select('otp')
        .eq('email', testEmail)
        .single();
      
      otpCode = data.otp;
    });
    
    it('should verify valid OTP and return tokens', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email: testEmail, otp: otpCode });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body.user).toHaveProperty('pseudonym');
      
      accessToken = response.body.tokens.accessToken;
      refreshToken = response.body.tokens.refreshToken;
    });
    
    it('should reject invalid OTP', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email: testEmail, otp: '000000' });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    it('should reject expired OTP', async () => {
      await supabase
        .from('otp_codes')
        .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
        .eq('email', testEmail);
      
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email: testEmail, otp: '123456' });
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('accessToken');
    });
    
    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/v1/auth/verify', () => {
    it('should verify valid access token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('should reject missing token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/verify');
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('POST /api/v1/auth/logout', () => {
    it('should logout user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});