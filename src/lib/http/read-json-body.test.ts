import { describe, expect, it } from 'vitest';
import { MAX_JSON_BODY_BYTES, readJsonBody, readJsonBodyOrResponse } from './read-json-body';

function jsonRequest(body: string, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}

describe('readJsonBody', () => {
  it('parses a JSON object', async () => {
    expect(await readJsonBody(jsonRequest('{"title":"x"}'))).toEqual({ title: 'x' });
  });

  it('rejects an oversized Content-Length before reading', async () => {
    await expect(
      readJsonBody(
        jsonRequest('{}', { 'Content-Length': String(MAX_JSON_BODY_BYTES + 1) }),
      ),
    ).rejects.toMatchObject({ status: 413 });
  });

  it('rejects an oversized chunked body without Content-Length', async () => {
    const oversized = `"${'x'.repeat(MAX_JSON_BODY_BYTES + 1)}"`;
    await expect(readJsonBody(jsonRequest(oversized))).rejects.toMatchObject({ status: 413 });
  });

  it('honors a custom limit', async () => {
    await expect(readJsonBody(jsonRequest('{"a":1}'), { maxBytes: 4 })).rejects.toMatchObject({
      status: 413,
    });
  });

  it('rejects invalid JSON', async () => {
    await expect(readJsonBody(jsonRequest('{'))).rejects.toMatchObject({ status: 400 });
  });

  it('rejects a missing body', async () => {
    const request = new Request('http://localhost/api/resume', { method: 'POST' });
    await expect(readJsonBody(request)).rejects.toMatchObject({ status: 400 });
  });
});

describe('readJsonBodyOrResponse', () => {
  it('returns data for a valid body', async () => {
    const result = await readJsonBodyOrResponse(jsonRequest('{"title":"x"}'), 1024);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ title: 'x' });
  });

  it('returns a 413 response instead of throwing', async () => {
    const result = await readJsonBodyOrResponse(jsonRequest('{"a":1}'), 4);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(413);
      await expect(result.response.json()).resolves.toMatchObject({ error: 'Request body too large' });
    }
  });

  it('returns a 400 response for invalid JSON', async () => {
    const result = await readJsonBodyOrResponse(jsonRequest('{'), 1024);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });
});
