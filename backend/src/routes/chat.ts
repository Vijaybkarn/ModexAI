import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

router.post('/conversations', authenticate, async (req: AuthRequest, res) => {
  try {
    const { title } = req.body;

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: req.user!.id,
        title: title || 'New Conversation'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(conversation);
  } catch (error) {
    logger.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.get('/conversations', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    res.json(conversations || []);
  } catch (error) {
    logger.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.get('/conversations/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .single();

    if (error) throw error;
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    res.json(conversation);
  } catch (error) {
    logger.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

router.get('/conversations/:id/messages', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', req.params.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json(messages || []);
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { conversation_id, model_id, message } = req.body;

    const { data: userMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        role: 'user',
        content: message
      })
      .select()
      .single();

    if (messageError) throw messageError;

    res.json({
      message: 'Message sent successfully',
      messageId: userMessage.id,
      response: 'This is a mock response. Ollama integration is pending.'
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
