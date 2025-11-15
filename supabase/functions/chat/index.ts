import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const OLLAMA_API_URL = 'https://llm-api.gosetle.com';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get token from Authorization header or query parameter (for EventSource)
    const url = new URL(req.url);
    let token = '';

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      token = authHeader.replace('Bearer ', '');
    } else {
      // EventSource can't send custom headers, so check query param
      token = url.searchParams.get('token') || '';
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse query parameters for GET (EventSource) or JSON body for POST
    let conversation_id: string;
    let model_id: string;
    let message: string;
    let stream = true;

    if (req.method === 'GET') {
      // EventSource sends GET requests with query parameters
      conversation_id = url.searchParams.get('conversation_id') || '';
      model_id = url.searchParams.get('model_id') || '';
      message = url.searchParams.get('message') || '';
      stream = true; // Always stream for GET requests
    } else {
      // POST requests with JSON body
      const body = await req.json();
      conversation_id = body.conversation_id;
      model_id = body.model_id;
      message = body.message;
      stream = body.stream !== false;
    }

    if (!conversation_id || !model_id || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: model } = await supabase
      .from('models')
      .select('*, ollama_endpoints(*)')
      .eq('id', model_id)
      .maybeSingle();

    if (!model) {
      return new Response(
        JSON.stringify({ error: 'Model not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save user message
    const { data: userMessage } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        role: 'user',
        content: message
      })
      .select()
      .single();

    const startTime = Date.now();

    if (stream) {
      // Streaming response (for EventSource)
      const ollamaResponse = await fetch(`${model.ollama_endpoints.base_url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.model_id,
          prompt: message,
          stream: true,
          options: model.parameters || {}
        })
      });

      if (!ollamaResponse.ok) {
        throw new Error(`Ollama API failed: ${ollamaResponse.status}`);
      }

      const reader = ollamaResponse.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          let fullResponse = '';
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.trim()) {
                  try {
                    const data = JSON.parse(line);
                    if (data.response) {
                      fullResponse += data.response;
                      // Send token to client
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: data.response, done: false })}\n\n`));
                    }

                    if (data.done) {
                      const responseTime = Date.now() - startTime;

                      // Save assistant message
                      const { data: assistantMessage } = await supabase.from('messages').insert({
                        conversation_id,
                        role: 'assistant',
                        content: fullResponse,
                        tokens: data.eval_count
                      }).select().single();

                      // Log usage
                      await supabase.from('usage_logs').insert({
                        user_id: user.id,
                        model_id,
                        endpoint_id: model.endpoint_id,
                        tokens_used: data.eval_count || 0,
                        response_time_ms: responseTime
                      });

                      // Update conversation timestamp
                      await supabase.from('conversations')
                        .update({ updated_at: new Date().toISOString() })
                        .eq('id', conversation_id);

                      // Send completion message with message ID
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        done: true,
                        message_id: assistantMessage?.id,
                        tokens_used: data.eval_count
                      })}\n\n`));

                      controller.close();
                      return;
                    }
                  } catch (e) {
                    console.error('Parse error:', e);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Stream error:', error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
            controller.error(error);
          } finally {
            reader.releaseLock();
          }
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming response
      const ollamaResponse = await fetch(`${model.ollama_endpoints.base_url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.model_id,
          prompt: message,
          stream: false,
          options: model.parameters || {}
        })
      });

      if (!ollamaResponse.ok) {
        throw new Error(`Ollama API failed: ${ollamaResponse.status}`);
      }

      const responseData = await ollamaResponse.json();
      const responseTime = Date.now() - startTime;

      const { data: assistantMessage } = await supabase
        .from('messages')
        .insert({
          conversation_id,
          role: 'assistant',
          content: responseData.response,
          tokens: responseData.eval_count
        })
        .select()
        .single();

      await supabase.from('usage_logs').insert({
        user_id: user.id,
        model_id,
        endpoint_id: model.endpoint_id,
        tokens_used: responseData.eval_count || 0,
        response_time_ms: responseTime
      });

      await supabase.from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversation_id);

      return new Response(
        JSON.stringify({
          userMessage,
          assistantMessage,
          response: responseData.response
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});