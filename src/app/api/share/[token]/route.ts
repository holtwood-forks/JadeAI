import { NextRequest, NextResponse } from 'next/server';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { shareRepository } from '@/lib/db/repositories/share.repository';
import { verifyPassword } from '@/lib/utils/share';
import { serializePublicResume } from '@/lib/share/public-resume';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { readJsonBody, RequestBodyError } from '@/lib/http/read-json-body';
import { MAX_SHARE_BODY_BYTES, MAX_SHARE_PASSWORD_LENGTH } from '@/lib/share/payload';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

function json(body: unknown, init: { status?: number } = {}) {
  return NextResponse.json(body, { ...init, headers: NO_STORE });
}

async function handleShare(
  request: NextRequest,
  token: string,
  password: string | null
) {
  if (password && password.length > MAX_SHARE_PASSWORD_LENGTH) {
    return json({ error: 'Invalid password' }, { status: 400 });
  }

  // Throttle password-guessing attempts per share link (and client IP) —
  // without this, PBKDF2 shares can be brute-forced online.
  if (password) {
    const rate = checkRateLimit(`share-pw:${token}:${getClientIp(request)}`, {
      limit: 10,
      windowMs: 60_000,
    });
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);
  }

  // 1. Try new resume_shares table first
  const share = await shareRepository.findByToken(token);
  if (share) {
    if (!share.isActive) {
      return json({ error: 'This share link has been disabled' }, { status: 403 });
    }

    if (share.password) {
      if (!password) {
        return json(
          { error: 'Password required', passwordRequired: true },
          { status: 401 }
        );
      }
      const isValid = await verifyPassword(password, share.password);
      if (!isValid) {
        return json(
          { error: 'Invalid password', passwordRequired: true },
          { status: 401 }
        );
      }
    }

    await shareRepository.incrementViewCount(share.id);

    const resume = await resumeRepository.findById(share.resumeId);
    if (!resume) {
      return json({ error: 'Not found' }, { status: 404 });
    }

    return json(serializePublicResume(resume));
  }

  // 2. Fallback to legacy resumes.shareToken
  const resume = await resumeRepository.findByShareToken(token);
  if (!resume) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  if (!resume.isPublic) {
    return json({ error: 'This resume is not shared' }, { status: 403 });
  }

  if (resume.sharePassword) {
    if (!password) {
      return json({ error: 'Password required', passwordRequired: true }, { status: 401 });
    }
    const isValid = await verifyPassword(password, resume.sharePassword);
    if (!isValid) {
      return json({ error: 'Invalid password', passwordRequired: true }, { status: 401 });
    }
  }

  await resumeRepository.incrementViewCount(resume.id);

  return json(serializePublicResume(resume));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    // GET is a no-password probe only. Passwords must go through POST: a query
    // string ends up in access logs, proxy logs and APM traces.
    return await handleShare(request, token, null);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/share/[token] error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await readJsonBody(request, { maxBytes: MAX_SHARE_BODY_BYTES });
    const password =
      body && typeof body === 'object' && !Array.isArray(body) && 'password' in body
        && typeof body.password === 'string'
        ? body.password
        : null;
    return await handleShare(request, token, password);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/share/[token] error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
