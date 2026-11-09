import { NextRequest, NextResponse } from 'next/server';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { generateShareToken, getShareUrl, hashPassword } from '@/lib/utils/share';
import { readJsonBody, RequestBodyError } from '@/lib/http/read-json-body';
import { MAX_SHARE_BODY_BYTES, readSharePassword } from '@/lib/share/payload';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resume = await resumeRepository.findByIdWithShareFields(id);
    if (!resume) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (resume.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await readJsonBody(request, { maxBytes: MAX_SHARE_BODY_BYTES });
    const password = readSharePassword(
      body && typeof body === 'object' && !Array.isArray(body) ? (body as { password?: unknown }).password : undefined,
    );

    // Reuse existing token or generate a new one
    const shareToken = resume.shareToken || generateShareToken();
    const hashedPassword = password ? await hashPassword(password) : resume.sharePassword;

    await resumeRepository.updateShareSettings(id, {
      isPublic: true,
      shareToken,
      sharePassword: hashedPassword,
    });

    return NextResponse.json({
      shareToken,
      shareUrl: getShareUrl(shareToken, request),
      isPublic: true,
    });
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/resume/[id]/share error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resume = await resumeRepository.findByIdWithShareFields(id);
    if (!resume) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (resume.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      isPublic: resume.isPublic,
      shareToken: resume.shareToken,
      shareUrl: resume.shareToken ? getShareUrl(resume.shareToken, request) : null,
      viewCount: resume.viewCount,
      hasPassword: !!resume.sharePassword,
    });
  } catch (error) {
    console.error('GET /api/resume/[id]/share error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resume = await resumeRepository.findByIdWithShareFields(id);
    if (!resume) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (resume.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await resumeRepository.updateShareSettings(id, {
      isPublic: false,
      shareToken: null,
      sharePassword: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/resume/[id]/share error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
