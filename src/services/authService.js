const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/database');
const { generateOTP, sendOTP } = require('./emailService');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  storeRefreshToken,
  validateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens
} = require('../utils/jwt');
const { sanitizeEmail } = require('../utils/sanitization');
const config = require('../config/env');
const logger = require('../config/logger');

const requestOTP = async (email) => {
  try {
    const sanitizedEmail = sanitizeEmail(email);
    
    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + config.otp.expiryMinutes);
    
    const { data: existingOTP, error: checkError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', sanitizedEmail)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (existingOTP && checkError?.code !== 'PGRST116') {
      const waitTime = Math.ceil((new Date(existingOTP.expires_at) - new Date()) / 1000 / 60);
      throw new Error(`Please wait ${waitTime} minutes before requesting a new code`);
    }
    
    const { error: deleteError } = await supabase
      .from('otp_codes')
      .delete()
      .eq('email', sanitizedEmail);
    
    if (deleteError) throw deleteError;
    
    const { error: insertError } = await supabase
      .from('otp_codes')
      .insert({
        email: sanitizedEmail,
        otp,
        expires_at: expiresAt.toISOString()
      });
    
    if (insertError) throw insertError;
    
    await sendOTP(sanitizedEmail, otp);
    
    logger.info(`OTP requested for ${sanitizedEmail}`);
    
    return {
      success: true,
      message: 'Verification code sent to your email',
      expiresIn: config.otp.expiryMinutes
    };
  } catch (error) {
    logger.error('OTP request failed:', error);
    throw error;
  }
};

const verifyOTP = async (email, otp) => {
  try {
    const sanitizedEmail = sanitizeEmail(email);
    
    const { data: otpRecord, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', sanitizedEmail)
      .eq('otp', otp)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !otpRecord) {
      throw new Error('Invalid or expired verification code');
    }
    
    await supabase
      .from('otp_codes')
      .delete()
      .eq('id', otpRecord.id);
    
    let user;
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', sanitizedEmail)
      .single();
    
    if (existingUser) {
      user = existingUser;
    } else {
      const pseudonym = `mood_${uuidv4().slice(0, 8)}`;
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: sanitizedEmail,
          pseudonym,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) throw createError;
      user = newUser;
    }
    
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    
    await storeRefreshToken(user.id, refreshToken);
    
    logger.info(`User authenticated: ${user.id}`);
    
    return {
      success: true,
      message: 'Authentication successful',
      user: {
        id: user.id,
        pseudonym: user.pseudonym
      },
      tokens: {
        accessToken,
        refreshToken
      }
    };
  } catch (error) {
    logger.error('OTP verification failed:', error);
    throw error;
  }
};

const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    
    await validateRefreshToken(refreshToken);
    
    const newAccessToken = generateAccessToken(decoded.userId);
    
    return {
      success: true,
      accessToken: newAccessToken
    };
  } catch (error) {
    logger.error('Token refresh failed:', error);
    throw error;
  }
};

const logout = async (refreshToken) => {
  try {
    await revokeRefreshToken(refreshToken);
    
    logger.info('User logged out');
    
    return {
      success: true,
      message: 'Logged out successfully'
    };
  } catch (error) {
    logger.error('Logout failed:', error);
    throw error;
  }
};

const logoutAll = async (userId) => {
  try {
    await revokeAllUserTokens(userId);
    
    logger.info(`All sessions revoked for user: ${userId}`);
    
    return {
      success: true,
      message: 'All sessions logged out'
    };
  } catch (error) {
    logger.error('Logout all failed:', error);
    throw error;
  }
};

module.exports = {
  requestOTP,
  verifyOTP,
  refreshAccessToken,
  logout,
  logoutAll
};