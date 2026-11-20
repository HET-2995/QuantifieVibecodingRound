export type Tone = 'professional' | 'casual' | 'concise';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Conversation {
  _id?: string;
  title: string;
  messages: Message[];
  tone: Tone;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationSummary {
  _id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  tone: Tone;
  messageCount: number;
}

export interface ChatRequest {
  conversationId?: string;
  message: string;
  tone: Tone;
}

export interface ApiError {
  error: string;
}
