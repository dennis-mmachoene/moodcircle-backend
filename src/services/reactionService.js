const { supabase } = require('../config/database');
const logger = require('../config/logger');

const VALID_REACTIONS = ['stay_strong', 'same_here', 'sending_love', 'grateful', 'understood'];

const addReaction = async (userId, postId, reactionType) => {
  try {
    if (!VALID_REACTIONS.includes(reactionType)) {
      throw new Error('Invalid reaction type');
    }
    
    const { data: post } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (!post) {
      throw new Error('Post not found or expired');
    }
    
    const { data: existing } = await supabase
      .from('reactions')
      .select('*')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();
    
    if (existing) {
      if (existing.reaction_type === reactionType) {
        await supabase
          .from('reactions')
          .delete()
          .eq('id', existing.id);
        
        logger.info(`Reaction removed: ${userId} -> ${postId}`);
        
        return {
          success: true,
          action: 'removed',
          reactionType: null
        };
      } else {
        const { error } = await supabase
          .from('reactions')
          .update({ 
            reaction_type: reactionType,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (error) throw error;
        
        logger.info(`Reaction updated: ${userId} -> ${postId} (${reactionType})`);
        
        return {
          success: true,
          action: 'updated',
          reactionType
        };
      }
    }
    
    const { error } = await supabase
      .from('reactions')
      .insert({
        user_id: userId,
        post_id: postId,
        reaction_type: reactionType,
        created_at: new Date().toISOString()
      });
    
    if (error) throw error;
    
    logger.info(`Reaction added: ${userId} -> ${postId} (${reactionType})`);
    
    return {
      success: true,
      action: 'added',
      reactionType
    };
  } catch (error) {
    logger.error('Add reaction failed:', error);
    throw error;
  }
};

const removeReaction = async (userId, postId) => {
  try {
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
    
    if (error) throw error;
    
    logger.info(`Reaction removed: ${userId} -> ${postId}`);
    
    return {
      success: true,
      message: 'Reaction removed'
    };
  } catch (error) {
    logger.error('Remove reaction failed:', error);
    throw error;
  }
};

const getPostReactions = async (postId) => {
  try {
    const { data, error } = await supabase
      .from('reactions')
      .select('reaction_type')
      .eq('post_id', postId);
    
    if (error) throw error;
    
    const counts = data.reduce((acc, r) => {
      acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
      return acc;
    }, {});
    
    const total = data.length;
    
    return {
      success: true,
      reactions: {
        total,
        breakdown: counts
      }
    };
  } catch (error) {
    logger.error('Get reactions failed:', error);
    throw error;
  }
};

const getUserReaction = async (userId, postId) => {
  try {
    const { data, error } = await supabase
      .from('reactions')
      .select('reaction_type')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    return {
      success: true,
      reaction: data?.reaction_type || null
    };
  } catch (error) {
    logger.error('Get user reaction failed:', error);
    throw error;
  }
};

module.exports = {
  addReaction,
  removeReaction,
  getPostReactions,
  getUserReaction,
  VALID_REACTIONS
};