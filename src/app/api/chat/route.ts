import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { connectToDatabase } from '@/lib/mongodb';
import { getSystemPrompt } from '@/lib/prompts';
import { ObjectId } from 'mongodb';
import { Tone } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lazy singleton — only created on first request, not at build time
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not defined. Add it to .env.local');
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export async function POST(req: NextRequest) {
  try {
    // --- Validate request ---
    const body = await req.json();
    const { conversationId, message, tone } = body as {
      conversationId?: string;
      message: string;
      tone: Tone;
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!tone || !['professional', 'casual', 'concise'].includes(tone)) {
      return NextResponse.json({ error: 'Invalid tone. Must be professional, casual, or concise.' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // --- Connect to DB and load/create conversation ---
    const { db } = await connectToDatabase();
    let conversationObjId: ObjectId;
    let conversationTitle: string;
    let priorMessages: { role: 'user' | 'assistant'; content: string }[] = [];

    if (conversationId && ObjectId.isValid(conversationId)) {
      conversationObjId = new ObjectId(conversationId);
      const existing = await db.collection('conversations').findOne({ _id: conversationObjId });
      if (!existing) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      conversationTitle = existing.title;
      // Build prior message context (last 20 messages to stay within token limits)
      const history = Array.isArray(existing.messages) ? existing.messages : [];
      priorMessages = history.slice(-20).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
    } else {
      // Auto-generate title from first user message (first 60 chars)
      conversationTitle = message.trim().slice(0, 60) + (message.trim().length > 60 ? '…' : '');
      const now = new Date();
      const result = await db.collection('conversations').insertOne({
        title: conversationTitle,
        messages: [],
        tone,
        createdAt: now,
        updatedAt: now,
      });
      conversationObjId = result.insertedId;
    }

    // --- Persist user message immediately ---
    const userMessage = {
      role: 'user' as const,
      content: message.trim(),
      timestamp: new Date(),
    };
    await db.collection('conversations').updateOne(
      { _id: conversationObjId },
      {
        $push: { messages: userMessage as unknown as never },
        $set: { updatedAt: new Date() },
      }
    );

    // --- Build OpenAI messages ---
    const systemPrompt = getSystemPrompt(tone);
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...priorMessages,
      { role: 'user', content: message.trim() },
    ];

    // --- Stream response ---
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send conversationId first so frontend can track it
          const metaChunk = JSON.stringify({ conversationId: conversationObjId.toString(), title: conversationTitle }) + '\n';
          controller.enqueue(encoder.encode(`data: ${metaChunk}\n`));

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: openaiMessages,
            stream: true,
            max_tokens: 2048,
            temperature: 0.7,
          });

          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              fullResponse += delta;
              const dataChunk = JSON.stringify({ delta });
              controller.enqueue(encoder.encode(`data: ${dataChunk}\n`));
            }
          }

          // --- Persist assistant response after streaming completes ---
          if (fullResponse.trim()) {
            const assistantMessage = {
              role: 'assistant' as const,
              content: fullResponse.trim(),
              timestamp: new Date(),
            };
            await db.collection('conversations').updateOne(
              { _id: conversationObjId },
              {
                $push: { messages: assistantMessage as unknown as never },
                $set: { updatedAt: new Date() },
              }
            );
          }

          // Signal done
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n`));
          controller.close();
        } catch (streamErr: unknown) {
          console.error('Streaming error:', streamErr);
          const errMsg = streamErr instanceof Error ? streamErr.message : 'Unknown streaming error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n`));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Conversation-Id': conversationObjId.toString(),
      },
    });
  } catch (err: unknown) {
    console.error('POST /api/chat error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
