import { describe, expect, it } from 'vitest';
import { errorEnvelope } from '../src/core/error-envelope.js';

describe('errorEnvelope', () => {
  it('builds a consistent envelope without details', () => {
    expect(errorEnvelope('X', 'msg')).toEqual({
      ok: false,
      error: { code: 'X', message: 'msg' },
    });
  });

  it('includes details when provided', () => {
    const out = errorEnvelope('Y', 'bad', { field: 'userId' });
    expect(out.error.details).toEqual({ field: 'userId' });
  });
});
