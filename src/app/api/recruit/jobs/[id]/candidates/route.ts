import { NextRequest, NextResponse } from 'next/server';
import { readJsonBodyOrResponse } from '@/lib/http/read-json-body';
import { recruitRepository } from '@/lib/db/repositories/recruit.repository';
import { createCandidateInputSchema } from '@/lib/ai/recruit-schema';
import { requireOwnedJob } from '@/lib/recruit/access';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedJob(request, id);
  if ('error' in access) return access.error;

  const bodyResult = await readJsonBodyOrResponse(request, 512 * 1024);
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;
  const parsed = createCandidateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const candidate = await recruitRepository.createCandidate({
    jobId: id,
    name: parsed.data.name,
  });
  return NextResponse.json({ candidate }, { status: 201 });
}
