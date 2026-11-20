'use client';

import { useState } from 'react';
import { Message } from '@/types';
import { Copy, Check, User, Bot } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments where clipboard API isn't available
      const textarea = document.createElement('textarea');
      textarea.value = message.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-accent/80' : 'bg-zinc-700'
        }`}
      >
        {isUser ? (
          <User size={14} className="text-white" />
        ) : (
          <Bot size={14} className="text-zinc-300" />
        )}
      </div>

      {/* Bubble */}
      <div className={`group flex flex-col max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-accent text-white rounded-tr-sm'
              : 'bg-bubble text-zinc-100 rounded-tl-sm border border-zinc-700'
          }`}
        >
          {message.content || (isStreaming ? '' : '…')}
          {isStreaming && <span className="streaming-cursor" />}
        </div>

        {/* Copy button — only shown for assistant messages with content */}
        {!isUser && message.content && !isStreaming && (
          <button
            onClick={handleCopy}
            className="mt-1.5 flex items-center gap-1 px-2 py-1 text-xs rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all opacity-0 group-hover:opacity-100"
            title="Copy response"
          >
            {copied ? (
              <>
                <Check size={11} className="text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                Copy
              </>
            )}
          </button>
        )}

        {/* Timestamp */}
        <span className="text-xs text-zinc-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {new Date(message.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}
