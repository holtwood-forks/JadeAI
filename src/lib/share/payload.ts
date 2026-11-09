import { RequestBodyError } from '@/lib/http/read-json-body';

export const MAX_SHARE_PASSWORD_LENGTH = 256;
export const MAX_SHARE_LABEL_LENGTH = 100;
/** A share dialog sends a label and a password; 8 KiB is already generous. */
export const MAX_SHARE_BODY_BYTES = 8 * 1024;

export function readSharePassword(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new RequestBodyError('password must be a string', 400);
  }
  if (value.length > MAX_SHARE_PASSWORD_LENGTH) {
    throw new RequestBodyError(
      `password must be at most ${MAX_SHARE_PASSWORD_LENGTH} characters`,
      400,
    );
  }
  return value;
}

export function readShareLabel(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > MAX_SHARE_LABEL_LENGTH) {
    throw new RequestBodyError(
      `label must be a string of at most ${MAX_SHARE_LABEL_LENGTH} characters`,
      400,
    );
  }
  return value;
}
