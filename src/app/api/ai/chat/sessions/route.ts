import { NextRequest, NextResponse } from 'next/server';
import { readJsonBodyOrResponse } from '@/lib/http/read-json-body';
import { resolveCurrentUser } from '@/lib/auth/helpers';
import { chatRepository } from '@/lib/db/repositories/chat.repository';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await resolveCurrentUser({ request });
    if (!currentUser) return new Response('Unauthorized', { status: 401 });

    const resumeId = request.nextUrl.searchParams.get('resumeId');
    if (!resumeId) return new Response('Missing resumeId', { status: 400 });

    const resume = await resumeRepository.findByIdForUser(resumeId, currentUser.user.id);
    if (!resume) return new Response('Not found', { status: 404 });

    const sessions = await chatRepository.findSessionsByResumeIdForUser(resumeId, currentUser.user.id);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('GET /api/ai/chat/sessions error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await resolveCurrentUser({ request });
    if (!currentUser) return new Response('Unauthorized', { status: 401 });

    const bodyResult = await readJsonBodyOrResponse(request, 8 * 1024);
    if (!bodyResult.ok) return bodyResult.response;
    const { resumeId } = bodyResult.data as { resumeId?: string };
    if (!resumeId) return new Response('Missing resumeId', { status: 400 });

    const session = await chatRepository.createSessionForUser({ resumeId, userId: currentUser.user.id });
    if (!session) return new Response('Not found', { status: 404 });
    return NextResponse.json({ session });
  } catch (error) {
    console.error('POST /api/ai/chat/sessions error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
