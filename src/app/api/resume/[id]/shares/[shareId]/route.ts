import { NextRequest, NextResponse } from 'next/server';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { shareRepository } from '@/lib/db/repositories/share.repository';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { hashPassword } from '@/lib/utils/share';
import { readJsonBody, RequestBodyError } from '@/lib/http/read-json-body';
import { MAX_SHARE_BODY_BYTES, readShareLabel, readSharePassword } from '@/lib/share/payload';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const { id, shareId } = await params;
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resume = await resumeRepository.findById(id);
    if (!resume || resume.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const share = await shareRepository.findById(shareId);
    if (!share || share.resumeId !== id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await readJsonBody(request, { maxBytes: MAX_SHARE_BODY_BYTES });
    const fields =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as { label?: unknown; password?: unknown; isActive?: unknown })
        : {};

    const updates: { label?: string; password?: string | null; isActive?: boolean } = {};
    if (fields.label !== undefined) updates.label = readShareLabel(fields.label);
    if (fields.password !== undefined) {
      const password = readSharePassword(fields.password);
      updates.password = password ? await hashPassword(password) : null;
    }
    if (fields.isActive !== undefined) {
      if (typeof fields.isActive !== 'boolean') {
        throw new RequestBodyError('isActive must be a boolean', 400);
      }
      updates.isActive = fields.isActive;
    }

    const updated = await shareRepository.update(shareId, updates);
    return NextResponse.json({
      ...updated,
      hasPassword: !!updated?.password,
      password: undefined,
    });
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('PATCH /api/resume/[id]/shares/[shareId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const { id, shareId } = await params;
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resume = await resumeRepository.findById(id);
    if (!resume || resume.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const share = await shareRepository.findById(shareId);
    if (!share || share.resumeId !== id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await shareRepository.delete(shareId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/resume/[id]/shares/[shareId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
