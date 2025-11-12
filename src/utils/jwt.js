const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { supabase } = require('../config/database');

const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId, type: 'access' },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiry }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry }
  );
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.accessSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('ACCESS_TOKEN_EXPIRED');
    }
    throw new Error('INVALID_ACCESS_TOKEN');
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('REFRESH_TOKEN_EXPIRED');
    }
    throw new Error('INVALID_REFRESH_TOKEN');
  }
};

const storeRefreshToken = async (userId, token) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  const { error } = await supabase
    .from('refresh_tokens')
    .insert({
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString()
    });
  
  if (error) throw error;
};

const validateRefreshToken = async (token) => {
  const { data, error } = await supabase
    .from('refresh_tokens')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .eq('revoked', false)
    .single();
  
  if (error || !data) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }
  
  return data;
};

const revokeRefreshToken = async (token) => {
  const { error } = await supabase
    .from('refresh_tokens')
    .update({ revoked: true })
    .eq('token', token);
  
  if (error) throw error;
};

const revokeAllUserTokens = async (userId) => {
  const { error } = await supabase
    .from('refresh_tokens')
    .update({ revoked: true })
    .eq('user_id', userId)
    .eq('revoked', false);
  
  if (error) throw error;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens
};