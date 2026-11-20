import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id] — fetch a single conversation with all messages
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const conversation = await db
      .collection('conversations')
      .findOne({ _id: new ObjectId(id) });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...conversation,
      _id: conversation._id.toString(),
    });
  } catch (err) {
    console.error('GET /api/conversations/[id] error:', err);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

// DELETE /api/conversations/[id] — delete a conversation
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    await db.collection('conversations').deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/conversations/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
