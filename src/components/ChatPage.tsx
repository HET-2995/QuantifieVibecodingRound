'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import { ConversationSummary, Message, Tone } from '@/types';

export default function ChatPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tone, setTone] = useState<Tone>('professional');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch conversation list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load a conversation when selected
  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveConversationId(id);
        setMessages(data.messages || []);
        setTone(data.tone || 'professional');
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  }, []);

  // Start a new conversation (clears the active state)
  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setTone('professional');
  }, []);

  // Send a message and handle streaming
  const handleSendMessage = useCallback(
    async (content: string, toneOverride?: Tone) => {
      const activeTone = toneOverride ?? tone;

      // Optimistically add user message
      const userMsg: Message = {
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      // Add a placeholder streaming assistant message
      const streamingMsg: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, streamingMsg]);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: activeConversationId,
            message: content,
            tone: activeTone,
          }),
        });

        if (!res.ok || !res.body) {
          const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: `Error: ${errData.error || 'Failed to get response'}`,
              timestamp: new Date(),
            };
            return updated;
          });
          setIsStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let newConvId: string | null = null;
        let assistantContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const parsed = JSON.parse(jsonStr);

              if (parsed.conversationId) {
                newConvId = parsed.conversationId;
                // Update active conversation ID immediately
                setActiveConversationId(parsed.conversationId);
              }

              if (parsed.delta) {
                assistantContent += parsed.delta;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: assistantContent,
                  };
                  return updated;
                });
              }

              if (parsed.error) {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: `Error: ${parsed.error}`,
                    timestamp: new Date(),
                  };
                  return updated;
                });
              }

              if (parsed.done) {
                setIsStreaming(false);
                // Refresh sidebar list
                fetchConversations();
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        setIsStreaming(false);
        if (newConvId) fetchConversations();
      } catch (err) {
        console.error('Send message error:', err);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: 'Network error. Please try again.',
            timestamp: new Date(),
          };
          return updated;
        });
        setIsStreaming(false);
      }
    },
    [activeConversationId, tone, fetchConversations]
  );

  // Regenerate the last assistant response
  const handleRegenerate = useCallback(async () => {
    if (isStreaming) return;

    // Find the last user message
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;

    const actualIdx = messages.length - 1 - lastUserIdx;
    const lastUserMessage = messages[actualIdx];

    // Remove the last assistant message
    setMessages((prev) => prev.slice(0, actualIdx + 1));

    // Resend
    await handleSendMessage(lastUserMessage.content);
  }, [messages, isStreaming, handleSendMessage]);

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (activeConversationId === id) {
        handleNewConversation();
      }
      fetchConversations();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }, [activeConversationId, handleNewConversation, fetchConversations]);

  return (
    <div className="flex h-screen overflow-hidden bg-chat">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={loadConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((p) => !p)}
      />
      <ChatWindow
        messages={messages}
        tone={tone}
        isStreaming={isStreaming}
        onSendMessage={handleSendMessage}
        onRegenerate={handleRegenerate}
        onToneChange={setTone}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((p) => !p)}
      />
    </div>
  );
}
