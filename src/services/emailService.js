const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

const generateOTP = () => {
  const length = config.otp.length;
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
};

const sendOTP = async (email, otp) => {
  try {
    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: 'Your MoodCircle Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 30px 0; }
            .code-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; }
            .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #667eea; margin: 0;">MoodCircle</h1>
              <p style="color: #666;">Anonymous Emotion Sharing</p>
            </div>
            
            <p>Hello,</p>
            <p>Your verification code for MoodCircle is:</p>
            
            <div class="code-box">
              <div class="code">${otp}</div>
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">This code expires in ${config.otp.expiryMinutes} minutes</p>
            </div>
            
            <p>If you didn't request this code, please ignore this email.</p>
            
            <div class="footer">
              <p>This is an automated message from MoodCircle. Please do not reply.</p>
              <p style="margin-top: 10px; font-size: 12px;">Share your emotions, not your identity.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your MoodCircle verification code is: ${otp}\n\nThis code expires in ${config.otp.expiryMinutes} minutes.\n\nIf you didn't request this code, please ignore this email.`
    };
    
    await transporter.sendMail(mailOptions);
    logger.info(`OTP sent to ${email}`);
    
    return true;
  } catch (error) {
    logger.error(`Failed to send OTP to ${email}:`, error);
    throw new Error('Failed to send verification email');
  }
};

const verifyTransporter = async () => {
  try {
    await transporter.verify();
    logger.info('✓ Email service ready');
    return true;
  } catch (error) {
    logger.warn('✗ Email service configuration issue:', error.message);
    return false;
  }
};

module.exports = {
  generateOTP,
  sendOTP,
  verifyTransporter
};