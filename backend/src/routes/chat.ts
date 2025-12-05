import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import logger from '../config/logger.js';
import { ollamaService } from '../services/ollama.js';

const router = express.Router();

// Log route registration for debugging
console.log('✅ Chat routes registered:');
console.log('   GET  /api/chat - SSE streaming');
console.log('   POST /api/chat - Non-streaming (backward compat)');
console.log('   GET  /api/chat/conversations - List conversations');
console.log('   POST /api/chat/conversations - Create conversation');

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

router.patch('/conversations/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { title, model_id } = req.body;
    const updates: any = {};

    if (title !== undefined) updates.title = title;
    if (model_id !== undefined) updates.model_id = model_id;

    const { data: conversation, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .select()
      .single();

    if (error) throw error;
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    res.json(conversation);
  } catch (error) {
    logger.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

router.delete('/conversations/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id);

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// GET route for SSE streaming (EventSource only supports GET)
// This handles: GET /api/chat?conversation_id=...&message=...&model_id=...&token=...
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    logger.info('📡 Chat SSE GET: Route hit!');
    logger.info(`   Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
    logger.info(`   Query params:`, JSON.stringify(req.query));
    
    const { conversation_id, model_id, message } = req.query;
    
    if (!conversation_id || !model_id || !message) {
      logger.warn('⚠️  Chat SSE: Missing required parameters');
      logger.warn(`   conversation_id: ${conversation_id || 'MISSING'}`);
      logger.warn(`   model_id: ${model_id || 'MISSING'}`);
      logger.warn(`   message: ${message ? 'PRESENT' : 'MISSING'}`);
      return res.status(400).json({ error: 'Missing required parameters: conversation_id, model_id, message' });
    }

    logger.info('📡 Chat SSE: Request received');
    logger.info(`   Conversation: ${conversation_id}, Model: ${model_id}`);
    logger.info(`   User: ${req.user?.email}`);

    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('*, ollama_endpoints(*)')
      .eq('id', model_id)
      .single();

    if (modelError || !model) {
      logger.error('❌ Chat SSE: Model not found:', model_id);
      res.write(`data: ${JSON.stringify({ error: 'Model not found' })}\n\n`);
      res.end();
      return;
    }

    logger.info(`✅ Chat SSE: Model found: ${model.name} (${model.model_id})`);
    logger.info(`   Endpoint: ${model.ollama_endpoints?.base_url}`);

    const { data: userMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation_id as string,
        role: 'user',
        content: message as string
      })
      .select()
      .single();

    if (messageError) {
      logger.error('❌ Chat SSE: Failed to save user message:', messageError);
      res.write(`data: ${JSON.stringify({ error: 'Failed to save message' })}\n\n`);
      res.end();
      return;
    }

    const startTime = Date.now();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    let fullResponse = '';
    let tokenCount = 0;

    try {
      logger.info(`🚀 Chat SSE: Starting stream generation for model ${model.model_id}`);
      const streamGenerator = ollamaService.generateStream({
        model: model.model_id,
        prompt: message as string,
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
          logger.info(`✅ Chat SSE: Stream completed in ${responseTime}ms, ${tokenCount} tokens`);

          await supabase.from('messages').insert({
            conversation_id: conversation_id as string,
            role: 'assistant',
            content: fullResponse,
            tokens: chunk.eval_count || tokenCount
          });

          await supabase.from('usage_logs').insert({
            user_id: req.user!.id,
            model_id: model_id as string,
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
      logger.error('❌ Chat SSE: Streaming error:', streamError);
      res.write(`data: ${JSON.stringify({ error: 'Stream failed', details: streamError instanceof Error ? streamError.message : String(streamError) })}\n\n`);
      res.end();
    }
  } catch (error) {
    logger.error('❌ Chat SSE: Error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Failed to process request' })}\n\n`);
    res.end();
  }
});

// POST route for non-streaming requests (backward compatibility)
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
