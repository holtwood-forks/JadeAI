import { NextRequest, NextResponse } from 'next/server';
import { readJsonBodyOrResponse } from '@/lib/http/read-json-body';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { interviewRepository } from '@/lib/db/repositories/interview.repository';
import { dbReady } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbReady;
  const { id: sessionId } = await params;
  const fingerprint = getUserIdFromRequest(request);
  const user = await resolveUser(fingerprint);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = await interviewRepository.findSession(sessionId);
  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const bodyResult = await readJsonBodyOrResponse(request, 8 * 1024);
  if (!bodyResult.ok) return bodyResult.response;
  const { messageId, marked } = bodyResult.data as { messageId?: unknown; marked?: unknown };
  if (typeof messageId !== 'string' || typeof marked !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const message = await interviewRepository.findMessage(messageId);
  if (!message) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const round = await interviewRepository.findRound(message.roundId);
  if (!round || round.sessionId !== sessionId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await interviewRepository.updateMessageMetadata(messageId, { marked });

  return NextResponse.json({ success: true });
}
