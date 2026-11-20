# APPROACH.md — AI Chat Assistant

## What I Was Building

A **full-stack AI Chat Assistant** for a timed technical assessment. The app lets users have real-time streaming conversations with an OpenAI-powered AI, with the full conversation history stored in MongoDB. Users can switch between three response tones, copy AI replies, and regenerate responses.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React)                  │
│                                                     │
│  ┌─────────────┐    ┌──────────────────────────┐   │
│  │   Sidebar   │    │       Chat Window         │   │
│  │             │    │  ┌────────────────────┐   │   │
│  │ Conversation│    │  │  Message Bubbles   │   │   │
│  │   List      │    │  │  (User/Assistant)  │   │   │
│  │             │    │  └────────────────────┘   │   │
│  │  [+ New]    │    │  ┌────────────────────┐   │   │
│  │             │    │  │   Tone Selector    │   │   │
│  │             │    │  │ 💼 😊 ⚡           │   │   │
│  └─────────────┘    │  └────────────────────┘   │   │
│                     │  ┌────────────────────┐   │   │
│                     │  │   Input + Send     │   │   │
│                     │  └────────────────────┘   │   │
│                     └──────────────────────────┘   │
└─────────────────────────┬───────────────────────────┘
                          │ HTTPS (SSE streaming)
┌─────────────────────────▼───────────────────────────┐
│              Next.js App Router (Node.js)            │
│                                                     │
│  POST /api/chat          → Streams OpenAI response  │
│  GET  /api/conversations → List all conversations   │
│  POST /api/conversations → Create new conversation  │
│  GET  /api/conversations/[id] → Load one chat       │
│  DELETE /api/conversations/[id] → Delete a chat     │
└──────────────┬──────────────────────┬───────────────┘
               │                      │
┌──────────────▼──────┐  ┌────────────▼───────────────┐
│   OpenAI API        │  │       MongoDB Atlas          │
│                     │  │                             │
│  gpt-4o-mini        │  │  Collection: conversations  │
│  Streaming          │  │  - title                    │
│  System prompts     │  │  - messages[]               │
│  per tone           │  │  - tone                     │
└─────────────────────┘  │  - createdAt / updatedAt   │
                         └─────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **Next.js 15** (App Router) | Full-stack React, API routes built-in |
| Language | **TypeScript** | Type safety, fewer runtime bugs |
| Styling | **Tailwind CSS** | Rapid UI development |
| AI | **OpenAI SDK** (`gpt-4o-mini`) | Official SDK, streaming support |
| Database | **MongoDB** (via Node driver) | Flexible document storage for chat logs |
| Icons | **lucide-react** | Lightweight icon set |

---

## Key Design Decisions

### 1. Server-Sent Events (SSE) Streaming
The `/api/chat` route returns a `ReadableStream` using the SSE format (`data: {...}\n`). The frontend reads chunks in real-time and appends each delta to the message bubble — giving the classic "typing" effect.

### 2. Tone Selection via System Prompts
Three tones are implemented purely server-side by swapping the OpenAI system prompt:
- **Professional** → formal, structured language
- **Casual** → friendly, conversational
- **Concise** → shortest possible answer, bullet points welcome

The frontend sends the selected tone with each request; the backend picks the matching system prompt. No prompt manipulation is ever exposed to the client.

### 3. MongoDB Conversation Persistence
Each conversation is a MongoDB document with an embedded `messages[]` array. When continuing a conversation, the last 20 messages are retrieved and passed as context to OpenAI (to stay within token limits). Both the user message and final assistant response are persisted.

### 4. Secret Management
- `OPENAI_API_KEY` and `MONGODB_URI` live only in `.env.local` (git-ignored)
- API routes run server-side — credentials never reach the browser
- `.env.example` contains placeholder keys for collaborators

### 5. Regenerate Response
"Regenerate" finds the last user message in the current conversation, strips the last assistant reply from the UI, and re-sends the same prompt. MongoDB is updated with the new response.

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root HTML shell
│   ├── page.tsx                # Entry point → <ChatPage />
│   ├── globals.css             # Tailwind base + custom styles
│   └── api/
│       ├── chat/route.ts       # POST — SSE streaming AI response
│       └── conversations/
│           ├── route.ts        # GET list / POST create
│           └── [id]/route.ts   # GET single / DELETE
├── components/
│   ├── ChatPage.tsx            # Top-level state manager
│   ├── ChatWindow.tsx          # Message area + input
│   ├── Sidebar.tsx             # Conversation history list
│   ├── MessageBubble.tsx       # User/assistant bubble + copy
│   └── ToneSelector.tsx        # 3-tone toggle
├── lib/
│   ├── mongodb.ts              # Singleton DB connection
│   └── prompts.ts              # System prompt per tone
└── types/
    └── index.ts                # Shared TypeScript types
```

---

## What Was Completed

- [x] Next.js project scaffolded with TypeScript + Tailwind
- [x] All MongoDB API routes (CRUD for conversations)
- [x] OpenAI streaming chat API route with SSE
- [x] Tone selection (Professional / Casual / Concise) via system prompts
- [x] Full React frontend — sidebar, chat window, message bubbles
- [x] Real-time streaming UI with blinking cursor
- [x] Copy AI response button (per message)
- [x] Regenerate response button
- [x] Create new conversation
- [x] Reopen previous conversations
- [x] Delete conversations
- [x] `.env.example` with safe placeholders
- [x] `.gitignore` protecting `.env.local`
- [x] TypeScript strict mode — zero type errors

## What Needs Manual Setup to Run

1. **MongoDB Atlas** — create a free cluster, get connection string, add to `.env.local`
2. **OpenAI API key** — create at platform.openai.com, add to `.env.local`
3. Run `npm run dev` to start the development server on `http://localhost:3000`

## Environment Variables Required

```env
OPENAI_API_KEY=sk-...
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ai_chat
MONGODB_DB=ai_chat
```
