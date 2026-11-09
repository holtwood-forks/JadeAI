/**
 * Bounded JSON body reader for API routes.
 *
 * `request.json()` accepts an unbounded payload, so a single caller can push
 * megabytes into memory and straight into the database. This enforces the limit
 * twice: once from `Content-Length` (cheap rejection) and once while streaming
 * (covers chunked uploads and dishonest headers).
 */
export const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;

export class RequestBodyError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'RequestBodyError';
  }
}

export async function readJsonBody(
  request: Request,
  options: { maxBytes?: number } = {},
): Promise<unknown> {
  const maxBytes = options.maxBytes ?? MAX_JSON_BODY_BYTES;

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyError('Request body too large', 413);
  }
  if (!request.body) {
    throw new RequestBodyError('Request body is required', 400);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        throw new RequestBodyError('Request body too large', 413);
      }
      chunks.push(value);
    }
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new RequestBodyError('Invalid JSON body', 400);
  }
}
