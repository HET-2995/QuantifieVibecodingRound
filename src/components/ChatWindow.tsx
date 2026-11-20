'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, Tone } from '@/types';
import MessageBubble from './MessageBubble';
import ToneSelector from './ToneSelector';
import { Send, RefreshCw, PanelLeftOpen } from 'lucide-react';

interface ChatWindowProps {
  messages: Message[];
  tone: Tone;
  isStreaming: boolean;
  onSendMessage: (content: string, tone?: Tone) => void;
  onRegenerate: () => void;
  onToneChange: (tone: Tone) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function ChatWindow({
  messages,
  tone,
  isStreaming,
  onSendMessage,
  onRegenerate,
  onToneChange,
  sidebarOpen,
  onToggleSidebar,
}: ChatWindowProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    onSendMessage(trimmed, tone);
  }, [input, isStreaming, onSendMessage, tone]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasMessages = messages.length > 0;
  const lastIsAssistant = hasMessages && messages[messages.length - 1].role === 'assistant';
  const canRegenerate = lastIsAssistant && !isStreaming;

  return (
    <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-chat shrink-0">
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Open sidebar"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
        <h1 className="text-sm font-semibold text-zinc-200 flex-1">AI Chat Assistant</h1>
        <ToneSelector tone={tone} onChange={onToneChange} disabled={isStreaming} />
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-zinc-200 mb-2">Start a Conversation</h2>
            <p className="text-sm text-zinc-500 max-w-sm">
              Ask me anything. Select a tone above and type your message below.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={idx}
              message={msg}
              isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Regenerate button */}
      {canRegenerate && (
        <div className="flex justify-center px-4 pb-2">
          <button
            onClick={onRegenerate}
            className="flex items-center gap-2 px-4 py-2 text-xs rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 bg-transparent hover:bg-zinc-800 transition-all"
          >
            <RefreshCw size={12} />
            Regenerate response
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 pb-4 shrink-0">
        <div className="flex items-end gap-3 bg-bubble border border-zinc-700 rounded-2xl px-4 py-3 focus-within:border-accent/60 transition-colors">
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-zinc-100 placeholder-zinc-500 leading-relaxed min-h-[24px] max-h-40"
            placeholder="Type a message… (Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            rows={1}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 p-2 rounded-xl bg-accent hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Send message"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
        <p className="text-xs text-zinc-600 text-center mt-2">AI can make mistakes. Verify important information.</p>
      </div>
    </div>
  );
}
