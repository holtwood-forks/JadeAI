import { NextRequest, NextResponse } from 'next/server';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { resolveCurrentUser } from '@/lib/auth/helpers';
import { TEMPLATES } from '@/lib/constants';
import { safeNormalizeResumeSectionContent } from '@/lib/resume-section/schema';
import { readJsonBody, RequestBodyError } from '@/lib/http/read-json-body';
import { validateResumeSections, validateResumeTitle } from '@/lib/resume/payload';
import type { ThemeConfigInput } from '@/lib/resume-theme/theme-config';
import type { ResumeSection } from '@/types/resume';

type ResumeUpdateBody = {
  title?: unknown;
  template?: unknown;
  language?: unknown;
  themeConfig?: unknown;
  sections?: unknown;
};

type IncomingSection = Pick<ResumeSection, 'id' | 'type' | 'title' | 'sortOrder' | 'visible' | 'content'>;

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await resolveCurrentUser({ request });
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resume = await resumeRepository.findById(id);
    if (!resume) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (resume.userId !== currentUser.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(resume);
  } catch (error) {
    console.error('GET /api/resume/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await resolveCurrentUser({ request });
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resume = await resumeRepository.findById(id);
    if (!resume) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (resume.userId !== currentUser.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await readJsonBody(request)) as ResumeUpdateBody | null;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new RequestBodyError('Expected a JSON object', 400);
    }
    validateResumeTitle(body.title);
    validateResumeSections(body.sections);

    const title = typeof body.title === 'string' ? body.title : undefined;
    const template = typeof body.template === 'string' ? body.template : undefined;
    const language = typeof body.language === 'string' ? body.language : undefined;
    const themeConfig =
      body.themeConfig === null
        ? null
        : body.themeConfig && typeof body.themeConfig === 'object'
          ? (body.themeConfig as ThemeConfigInput)
          : undefined;
    const incomingSections = Array.isArray(body.sections)
      ? (body.sections as IncomingSection[])
      : undefined;

    if (template !== undefined && !(TEMPLATES as readonly string[]).includes(template)) {
      return NextResponse.json({ error: 'Unknown template' }, { status: 400 });
    }

    // Update resume metadata
    // Sync sections: create new, update existing, delete removed
    const updated = await resumeRepository.replaceDraftForUser({
      id,
      userId: currentUser.user.id,
      ...(title !== undefined ? { title } : {}),
      ...(template !== undefined ? { template } : {}),
      ...(themeConfig !== undefined ? { themeConfig } : {}),
      ...(language !== undefined ? { language } : {}),
      ...(incomingSections ? {
        sections: incomingSections.map((section, index) => ({
          id: section.id,
          type: section.type,
          title: section.title,
          sortOrder: Number.isFinite(section.sortOrder) ? section.sortOrder : index,
          visible: section.visible !== false,
          // Normalize content so null/primitive payloads can never corrupt the
          // stored resume and break rendering/export later.
          content: safeNormalizeResumeSectionContent(section.type, section.content),
        })),
      } : {}),
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('PUT /api/resume/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await resolveCurrentUser({ request });
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resume = await resumeRepository.findById(id);
    if (!resume) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (resume.userId !== currentUser.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await resumeRepository.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/resume/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
