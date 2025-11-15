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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { conversation_id, model_id, message, stream = true } = await req.json();

    const { data: model } = await supabase
      .from('models')
      .select('*, ollama_endpoints(*)')
      .eq('id', model_id)
      .single();

    if (!model) {
      return new Response(
        JSON.stringify({ error: 'Model not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        throw new Error('Ollama API failed');
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
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: data.response, done: data.done })}\n\n`));
                    }

                    if (data.done) {
                      const responseTime = Date.now() - startTime;

                      await supabase.from('messages').insert({
                        conversation_id,
                        role: 'assistant',
                        content: fullResponse,
                        tokens: data.eval_count
                      });

                      await supabase.from('usage_logs').insert({
                        user_id: user.id,
                        model_id,
                        endpoint_id: model.endpoint_id,
                        tokens_used: data.eval_count || 0,
                        response_time_ms: responseTime
                      });

                      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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
        throw new Error('Ollama API failed');
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