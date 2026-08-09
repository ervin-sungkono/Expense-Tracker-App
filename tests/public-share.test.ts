import {
  createPublicShareToken,
  publicShareTokenHash,
  publicShareTokenHashDatabaseValue,
} from '@lib/public-share/server';

describe('public share token helpers', () => {
  it('creates a high-entropy URL-safe token', () => {
    const token = createPublicShareToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it('hashes the token consistently for database lookup', () => {
    const token = 'public-share-test-token';
    const hash = publicShareTokenHash(token);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(publicShareTokenHash(token)).toBe(hash);
    expect(publicShareTokenHashDatabaseValue(token)).toBe(`\\x${hash}`);
  });
});
