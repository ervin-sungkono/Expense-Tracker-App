import { createHash, randomBytes } from 'node:crypto';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

export function createPublicShareToken() {
  return randomBytes(32).toString('base64url');
}

export function publicShareTokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function publicShareTokenHashDatabaseValue(token: string) {
  return `\\x${publicShareTokenHash(token)}`;
}
