const { createClient } = require('@supabase/supabase-js');
const config = require('./env');
const logger = require('./logger');

const supabase = createClient(config.supabase.url, config.supabase.key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const supabaseAdmin = config.supabase.serviceKey 
  ? createClient(config.supabase.url, config.supabase.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase;

const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    logger.info('✓ Database connection successful');
    return true;
  } catch (error) {
    logger.error('✗ Database connection failed:', error.message);
    throw new Error('Failed to connect to Supabase. Check your credentials.');
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection
};