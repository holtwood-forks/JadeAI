import { NextRequest, NextResponse } from 'next/server';
import { resolveCurrentUser } from '@/lib/auth/helpers';
import { userRepository } from '@/lib/db/repositories/user.repository';
import { readJsonBody, RequestBodyError } from '@/lib/http/read-json-body';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await resolveCurrentUser({ request });
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const settings = await userRepository.getSettings(currentUser.user.id);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('GET /api/user/settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await resolveCurrentUser({ request });
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = await readJsonBody(request, { maxBytes: 64 * 1024 });
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new RequestBodyError('Expected a JSON object', 400);
    }
    const body = parsed as Record<string, unknown>;

    // Only allow known settings keys (exclude sensitive data like API keys)
    const allowedKeys = ['aiProvider', 'aiBaseURL', 'aiModel', 'autoSave', 'autoSaveInterval'];
    const filtered: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (key in body) {
        filtered[key] = body[key];
      }
    }

    const settings = await userRepository.updateSettings(currentUser.user.id, filtered);
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('PUT /api/user/settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
