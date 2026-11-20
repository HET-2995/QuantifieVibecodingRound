'use client';

import { ConversationSummary } from '@/types';
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface SidebarProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen,
  onToggle,
}: SidebarProps) {
  return (
    <aside
      className={`flex flex-col bg-sidebar border-r border-zinc-800 transition-all duration-300 ease-in-out shrink-0 ${
        isOpen ? 'w-64' : 'w-0 overflow-hidden'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
        <span className="font-semibold text-sm text-zinc-200 tracking-wide">Conversations</span>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Close sidebar"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 py-3">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-accent hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New Conversation
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {conversations.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center mt-6 px-2">No conversations yet. Start a new one!</p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv._id}
              className={`group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                activeConversationId === conv._id
                  ? 'bg-zinc-700 text-white'
                  : 'hover:bg-zinc-800 text-zinc-300'
              }`}
              onClick={() => onSelectConversation(conv._id)}
            >
              <MessageSquare size={14} className="mt-0.5 shrink-0 text-zinc-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{conv.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {formatDate(conv.updatedAt)} · {conv.messageCount} msg{conv.messageCount !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conv._id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-600 text-zinc-400 hover:text-red-400 transition-all shrink-0"
                title="Delete conversation"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
