import { NextRequest, NextResponse } from 'next/server';
import { resolveCurrentUser } from '@/lib/auth/helpers';
import { userRepository } from '@/lib/db/repositories/user.repository';
import { readJsonBody, RequestBodyError } from '@/lib/http/read-json-body';
import { normalizeUserSettings } from '@/lib/db/settings-normalize';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await resolveCurrentUser({ request });
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({
      ...currentUser.user,
      settings: normalizeUserSettings(currentUser.user.settings),
    });
  } catch (error) {
    console.error('GET /api/user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await resolveCurrentUser({ request });
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = await readJsonBody(request, { maxBytes: 8 * 1024 });
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new RequestBodyError('Expected a JSON object', 400);
    }
    const { name, avatarUrl } = parsed as { name?: unknown; avatarUrl?: unknown };

    if (name !== undefined && (typeof name !== 'string' || name.length > 100)) {
      throw new RequestBodyError('name must be a string of at most 100 characters', 400);
    }
    if (avatarUrl !== undefined && (typeof avatarUrl !== 'string' || avatarUrl.length > 2048)) {
      throw new RequestBodyError('avatarUrl must be a string of at most 2048 characters', 400);
    }

    const updated = await userRepository.update(currentUser.user.id, {
      ...(name ? { name } : {}),
      ...(avatarUrl ? { avatarUrl } : {}),
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('PUT /api/user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
