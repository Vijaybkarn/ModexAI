import { useEffect, useRef } from 'react';
import type { Message } from '../../types';
import { MessageBubble } from './MessageBubble';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  isGenerating?: boolean;
}

export function ChatWindow({ messages, isLoading, isGenerating = false }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0 && !isLoading && !isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="text-slate-400 dark:text-slate-500 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
            No messages yet
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Select a model and start typing to begin chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth">
      <div className="max-w-4xl mx-auto w-full">
        {messages.map((message, index) => {
          const isLastMessage = index === messages.length - 1;
          const isLastAssistantGenerating = isLastMessage && message.role === 'assistant' && isGenerating;

          return (
            <MessageBubble
              key={message.id || index}
              message={message}
              showLatency={message.role === 'assistant' && message.latency_ms}
              isGenerating={isLastAssistantGenerating}
            />
          );
        })}
        {isGenerating && (messages.length === 0 || messages[messages.length - 1]?.role !== 'assistant' || messages[messages.length - 1]?.content === '') && (
          <div className="flex justify-start mb-4 items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Thinking</span>
            <div className="flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>
    </div>
  );
}
