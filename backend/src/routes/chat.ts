import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import logger from '../config/logger.js';
import { ollamaService } from '../services/ollama.js';

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
    const { conversation_id, model_id, message, stream = true } = req.body;

    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('*, ollama_endpoints(*)')
      .eq('id', model_id)
      .single();

    if (modelError || !model) {
      return res.status(404).json({ error: 'Model not found' });
    }

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

    const startTime = Date.now();

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponse = '';
      let tokenCount = 0;

      try {
        const streamGenerator = ollamaService.generateStream({
          model: model.model_id,
          prompt: message,
          stream: true,
          options: model.parameters || {}
        }, model.ollama_endpoints.base_url);

        for await (const chunk of streamGenerator) {
          if (chunk.response) {
            fullResponse += chunk.response;
            tokenCount++;
            res.write(`data: ${JSON.stringify({ content: chunk.response, done: chunk.done })}\n\n`);
          }

          if (chunk.done) {
            const responseTime = Date.now() - startTime;

            await supabase.from('messages').insert({
              conversation_id,
              role: 'assistant',
              content: fullResponse,
              tokens: chunk.eval_count || tokenCount
            });

            await supabase.from('usage_logs').insert({
              user_id: req.user!.id,
              model_id,
              endpoint_id: model.endpoint_id,
              tokens_used: chunk.eval_count || tokenCount,
              response_time_ms: responseTime
            });

            res.write('data: [DONE]\n\n');
            res.end();
            return;
          }
        }
      } catch (streamError) {
        logger.error('Streaming error:', streamError);
        res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
        res.end();
      }
    } else {
      const response = await ollamaService.generate({
        model: model.model_id,
        prompt: message,
        stream: false,
        options: model.parameters || {}
      }, model.ollama_endpoints.base_url);

      const responseTime = Date.now() - startTime;

      const { data: assistantMessage } = await supabase
        .from('messages')
        .insert({
          conversation_id,
          role: 'assistant',
          content: response.response,
          tokens: response.eval_count
        })
        .select()
        .single();

      await supabase.from('usage_logs').insert({
        user_id: req.user!.id,
        model_id,
        endpoint_id: model.endpoint_id,
        tokens_used: response.eval_count || 0,
        response_time_ms: responseTime
      });

      res.json({
        userMessage,
        assistantMessage,
        response: response.response
      });
    }
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
