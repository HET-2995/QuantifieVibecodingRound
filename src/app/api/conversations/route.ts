import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ConversationSummary } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/conversations — list all conversations (summary)
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const conversations = await db
      .collection('conversations')
      .find({})
      .project({ title: 1, createdAt: 1, updatedAt: 1, tone: 1, messages: 1 })
      .sort({ updatedAt: -1 })
      .toArray();

    const summaries: ConversationSummary[] = conversations.map((c) => ({
      _id: c._id.toString(),
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      tone: c.tone,
      messageCount: Array.isArray(c.messages) ? c.messages.length : 0,
    }));

    return NextResponse.json(summaries);
  } catch (err) {
    console.error('GET /api/conversations error:', err);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST /api/conversations — create a new conversation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, tone } = body;

    if (!tone || !['professional', 'casual', 'concise'].includes(tone)) {
      return NextResponse.json({ error: 'Invalid tone' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const now = new Date();
    const result = await db.collection('conversations').insertOne({
      title: title || 'New Conversation',
      messages: [],
      tone,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ _id: result.insertedId.toString(), title: title || 'New Conversation', tone, messages: [], createdAt: now, updatedAt: now }, { status: 201 });
  } catch (err) {
    console.error('POST /api/conversations error:', err);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
