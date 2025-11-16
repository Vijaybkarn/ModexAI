import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import { Header } from '../components/layout/Header';
import { ChatWindow } from '../components/chat/ChatWindow';
import { MessageComposer } from '../components/chat/MessageComposer';
import { ModelSelector } from '../components/chat/ModelSelector';
import { ConversationList } from '../components/chat/ConversationList';
import type { Conversation, Message } from '../types';
import { Plus } from 'lucide-react';

export function ChatPage() {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { apiRequest } = useApi();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationListKey, setConversationListKey] = useState(0);

  const createNewConversation = useCallback(async () => {
    try {
      const data = await apiRequest<Conversation>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: `Chat ${new Date().toLocaleDateString()}`,
          model_id: selectedModelId || null
        })
      });
      navigate(`/chat/${data.id}`);
      setConversation(data);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create conversation');
    }
  }, [apiRequest, navigate, selectedModelId]);

  const loadConversation = useCallback(async (convId: string) => {
    try {
      setLoading(true);
      const [convData, messagesData] = await Promise.all([
        apiRequest<Conversation>(`/api/conversations/${convId}`),
        apiRequest<Message[]>(`/api/conversations/${convId}/messages`)
      ]);
      setConversation(convData);
      setMessages(messagesData);
      if (convData.model_id && !selectedModelId) {
        setSelectedModelId(convData.model_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId, loadConversation]);

  const handleSendMessage = async (message: string) => {
    if (!conversationId || !selectedModelId) return;

    try {
      setError(null);

      // Update conversation title with first message and save model_id
      if (messages.length === 0) {
        const truncatedMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
        await apiRequest(`/api/conversations/${conversationId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: truncatedMessage,
            model_id: selectedModelId
          })
        });
        setConversation(prev => prev ? { ...prev, title: truncatedMessage, model_id: selectedModelId } : null);
        setConversationListKey(prev => prev + 1);
      }

      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        role: 'user',
        content: message,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMessage]);

      // Build the SSE URL with proper API base and token
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = session?.access_token || '';

      // Construct URL based on environment (Edge Functions vs local backend)
      let sseUrl: string;
      if (API_BASE_URL.includes('supabase.co/functions')) {
        sseUrl = `${API_BASE_URL}/chat?conversation_id=${conversationId}&message=${encodeURIComponent(message)}&model_id=${selectedModelId}&token=${encodeURIComponent(token)}`;
      } else {
        sseUrl = `${API_BASE_URL}/api/chat?conversation_id=${conversationId}&message=${encodeURIComponent(message)}&model_id=${selectedModelId}&token=${encodeURIComponent(token)}`;
      }

      const eventSource = new EventSource(sseUrl);
      setIsGenerating(true);

      let assistantMessage: Message = {
        id: `temp-assistant-${Date.now()}`,
        conversation_id: conversationId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      };

      // Add empty assistant message to trigger its appearance
      setMessages(prev => [...prev, assistantMessage]);

      eventSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.token) {
            assistantMessage.content += data.token;
            setMessages(prev => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                updated[updated.length - 1] = { ...assistantMessage };
              }
              return updated;
            });
          }

          if (data.done) {
            eventSource.close();
            setIsGenerating(false);
            if (data.message_id) {
              assistantMessage.id = data.message_id;
            }
          }

          if (data.error) {
            throw new Error(data.error);
          }
        } catch (err) {
          console.error('Stream parse error:', err);
        }
      });

      eventSource.onerror = (err) => {
        eventSource.close();
        setIsGenerating(false);
        setError('Connection lost while streaming response');
        console.error('Stream error:', err);
      };

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Header
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        title={conversation?.title || 'Chat'}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0'
          } bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300 ease-in-out flex flex-col`}
        >
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={createNewConversation}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedModelId}
              title={!selectedModelId ? 'Please wait for models to load' : 'Create new conversation'}
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ConversationList
              key={conversationListKey}
              currentConversationId={conversationId}
              onConversationDeleted={() => {
                setConversation(null);
                setMessages([]);
                navigate('/chat');
              }}
            />
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3 text-red-700 dark:text-red-200 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 rounded-md transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Chat Messages */}
          <ChatWindow
            messages={messages}
            isLoading={loading}
            isGenerating={isGenerating}
          />

          {/* Bottom Input Area with Model Selector */}
          <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
            <div className="max-w-4xl mx-auto px-4 pt-4 pb-2">
              <MessageComposer
                onSendMessage={handleSendMessage}
                disabled={!conversationId || !selectedModelId || loading || isGenerating}
              />
              <div className="mt-3 pb-2">
                <ModelSelector
                  selectedModelId={selectedModelId}
                  onModelSelect={setSelectedModelId}
                  disabled={isGenerating}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
