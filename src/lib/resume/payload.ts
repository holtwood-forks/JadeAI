import { MAX_RESUME_SECTIONS, MAX_RESUME_TITLE_LENGTH } from '@/lib/constants';
import { RequestBodyError } from '@/lib/http/read-json-body';

/** Reject oversized/typed-wrong metadata before it reaches the database. */
export function validateResumeTitle(title: unknown): void {
  if (title === undefined) return;
  if (typeof title !== 'string' || title.length > MAX_RESUME_TITLE_LENGTH) {
    throw new RequestBodyError(
      `title must be a string of at most ${MAX_RESUME_TITLE_LENGTH} characters`,
      400,
    );
  }
}

export function validateResumeSections(sections: unknown): void {
  if (sections === undefined) return;
  if (!Array.isArray(sections)) {
    throw new RequestBodyError('sections must be an array', 400);
  }
  if (sections.length > MAX_RESUME_SECTIONS) {
    throw new RequestBodyError(
      `sections must contain at most ${MAX_RESUME_SECTIONS} entries`,
      400,
    );
  }
}
