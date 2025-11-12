const { supabase, supabaseAdmin } = require('../config/database');
const { classifyMood } = require('./moodClassifier');
const { sanitizePostContent } = require('../utils/sanitization');
const config = require('../config/env');
const logger = require('../config/logger');

const createPost = async (userId, content, mood, voiceFileUrl = null) => {
  try {
    const sanitizedContent = sanitizePostContent(content);
    
    if (!sanitizedContent || sanitizedContent.length < 1) {
      throw new Error('Post content cannot be empty');
    }
    
    let finalMood = mood;
    let moodConfidence = 1.0;
    
    if (!mood) {
      const classification = await classifyMood(sanitizedContent);
      finalMood = classification.mood;
      moodConfidence = classification.confidence;
    }
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.posts.expiryHours);
    
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content: sanitizedContent,
        mood: finalMood,
        mood_confidence: moodConfidence,
        voice_url: voiceFileUrl,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        users(pseudonym)
      `)
      .single();
    
    if (error) throw error;
    
    logger.info(`Post created: ${data.id} by user ${userId}`);
    
    return {
      success: true,
      post: {
        id: data.id,
        content: data.content,
        mood: data.mood,
        moodConfidence: data.mood_confidence,
        voiceUrl: data.voice_url,
        author: data.users.pseudonym,
        createdAt: data.created_at,
        expiresAt: data.expires_at
      }
    };
  } catch (error) {
    logger.error('Post creation failed:', error);
    throw error;
  }
};

const getPostsByMood = async (mood, page = 1, limit = 20, userId = null) => {
  try {
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('posts')
      .select(`
        *,
        users(pseudonym),
        reactions(count)
      `, { count: 'exact' })
      .eq('mood', mood)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    let userReactions = {};
    if (userId) {
      const { data: reactions } = await supabase
        .from('reactions')
        .select('post_id, reaction_type')
        .eq('user_id', userId)
        .in('post_id', data.map(p => p.id));
      
      if (reactions) {
        userReactions = reactions.reduce((acc, r) => {
          acc[r.post_id] = r.reaction_type;
          return acc;
        }, {});
      }
    }
    
    const posts = data.map(post => ({
      id: post.id,
      content: post.content,
      mood: post.mood,
      moodConfidence: post.mood_confidence,
      voiceUrl: post.voice_url,
      author: post.users.pseudonym,
      reactionCount: post.reactions?.[0]?.count || 0,
      userReaction: userReactions[post.id] || null,
      createdAt: post.created_at,
      expiresAt: post.expires_at,
      timeRemaining: getTimeRemaining(post.expires_at)
    }));
    
    return {
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    logger.error('Failed to fetch posts:', error);
    throw error;
  }
};

const getAllPosts = async (page = 1, limit = 20, userId = null) => {
  try {
    const offset = (page - 1) * limit;
    
    const { data, error, count } = await supabase
      .from('posts')
      .select(`
        *,
        users(pseudonym),
        reactions(count)
      `, { count: 'exact' })
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    let userReactions = {};
    if (userId) {
      const { data: reactions } = await supabase
        .from('reactions')
        .select('post_id, reaction_type')
        .eq('user_id', userId)
        .in('post_id', data.map(p => p.id));
      
      if (reactions) {
        userReactions = reactions.reduce((acc, r) => {
          acc[r.post_id] = r.reaction_type;
          return acc;
        }, {});
      }
    }
    
    const posts = data.map(post => ({
      id: post.id,
      content: post.content,
      mood: post.mood,
      moodConfidence: post.mood_confidence,
      voiceUrl: post.voice_url,
      author: post.users.pseudonym,
      reactionCount: post.reactions?.[0]?.count || 0,
      userReaction: userReactions[post.id] || null,
      createdAt: post.created_at,
      expiresAt: post.expires_at,
      timeRemaining: getTimeRemaining(post.expires_at)
    }));
    
    return {
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    logger.error('Failed to fetch all posts:', error);
    throw error;
  }
};

const getPost = async (postId, userId = null) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users(pseudonym),
        reactions(count)
      `)
      .eq('id', postId)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Post not found or expired');
    
    let userReaction = null;
    if (userId) {
      const { data: reaction } = await supabase
        .from('reactions')
        .select('reaction_type')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();
      
      userReaction = reaction?.reaction_type || null;
    }
    
    return {
      success: true,
      post: {
        id: data.id,
        content: data.content,
        mood: data.mood,
        moodConfidence: data.mood_confidence,
        voiceUrl: data.voice_url,
        author: data.users.pseudonym,
        reactionCount: data.reactions?.[0]?.count || 0,
        userReaction,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
        timeRemaining: getTimeRemaining(data.expires_at)
      }
    };
  } catch (error) {
    logger.error('Failed to fetch post:', error);
    throw error;
  }
};

const deleteExpiredPosts = async () => {
  try {
    const { data: expiredPosts, error: fetchError } = await supabaseAdmin
      .from('posts')
      .select('id, voice_url')
      .lt('expires_at', new Date().toISOString());
    
    if (fetchError) throw fetchError;
    
    if (!expiredPosts || expiredPosts.length === 0) {
      logger.info('No expired posts to delete');
      return { success: true, deleted: 0 };
    }
    
    for (const post of expiredPosts) {
      if (post.voice_url) {
        try {
          const filePath = post.voice_url.split('/').pop();
          await supabaseAdmin.storage
            .from('voice-posts')
            .remove([filePath]);
        } catch (storageError) {
          logger.warn(`Failed to delete voice file: ${storageError.message}`);
        }
      }
    }
    
    const { error: deleteError } = await supabaseAdmin
      .from('posts')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (deleteError) throw deleteError;
    
    logger.info(`Deleted ${expiredPosts.length} expired posts`);
    
    return {
      success: true,
      deleted: expiredPosts.length
    };
  } catch (error) {
    logger.error('Failed to delete expired posts:', error);
    throw error;
  }
};

const getTimeRemaining = (expiresAt) => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry - now;
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

module.exports = {
  createPost,
  getPostsByMood,
  getAllPosts,
  getPost,
  deleteExpiredPosts
};