import type { Message } from '../../types';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface MessageBubbleProps {
  message: Message;
  showLatency?: number | null;
}

export function MessageBubble({ message, showLatency }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in w-full`}>
      <div
        className={`max-w-[75%] lg:max-w-[65%] ${
          isUser
            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-md'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-2xl rounded-tl-md'
        } px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        <div className="flex items-center justify-between gap-3 mt-2">
          <div className="flex items-center gap-2">
            {showLatency && (
              <span className={`text-xs ${isUser ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {showLatency}ms
              </span>
            )}
            {message.tokens_used && (
              <span className={`text-xs ${isUser ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {message.tokens_used} tokens
              </span>
            )}
          </div>
          {!isUser && (
            <button
              onClick={handleCopy}
              className={`p-1 rounded hover:opacity-70 transition-opacity ${
                isUser ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
              }`}
              title="Copy message"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
