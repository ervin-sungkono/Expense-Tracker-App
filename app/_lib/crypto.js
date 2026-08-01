const CRYPTO_VERSION = 1;

function getCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto is unavailable. Use Xpensed over HTTPS in a supported browser.');
  }
  return globalThis.crypto;
}

export function bytesToBase64(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function randomBytes(length) {
  return getCrypto().getRandomValues(new Uint8Array(length));
}

async function derivePassphraseKey(passphrase, salt, iterations) {
  const subtle = getCrypto().subtle;
  const material = await subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  );
}

async function generateUserKeyMaterial() {
  const subtle = getCrypto().subtle;
  const pair = await subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 3072,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['wrapKey', 'unwrapKey']
  );
  const privatePkcs8 = await subtle.exportKey('pkcs8', pair.privateKey);
  const privateKey = await subtle.importKey(
    'pkcs8',
    privatePkcs8,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['unwrapKey']
  );
  const publicKeyJwk = await subtle.exportKey('jwk', pair.publicKey);
  const fingerprintBytes = await subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(publicKeyJwk))
  );

  return {
    publicKeyJwk,
    privateKey,
    fingerprint: bytesToBase64(fingerprintBytes),
  };
}

export async function generateDeviceKeyring() {
  const { publicKeyJwk, privateKey, fingerprint } = await generateUserKeyMaterial();
  return { publicKeyJwk, privateKey, fingerprint };
}

export async function recoverPrivateKey(passphrase, backup) {
  const subtle = getCrypto().subtle;
  const iv = base64ToBytes(backup.iv);
  const salt = base64ToBytes(backup.salt);
  const passphraseKey = await derivePassphraseKey(passphrase, salt, backup.kdf_iterations);

  return subtle.unwrapKey(
    'pkcs8',
    base64ToBytes(backup.encrypted_private_key),
    passphraseKey,
    { name: 'AES-GCM', iv },
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['unwrapKey']
  );
}

export async function importPublicKey(publicKeyJwk) {
  return getCrypto().subtle.importKey(
    'jwk',
    publicKeyJwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['wrapKey']
  );
}

export function generateSpaceKey() {
  return getCrypto().subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

export async function wrapSpaceKey(spaceKey, publicKey) {
  const wrapped = await getCrypto().subtle.wrapKey('raw', spaceKey, publicKey, {
    name: 'RSA-OAEP',
  });
  return bytesToBase64(wrapped);
}

export async function unwrapSpaceKey(wrappedSpaceKey, privateKey) {
  return getCrypto().subtle.unwrapKey(
    'raw',
    base64ToBytes(wrappedSpaceKey),
    privateKey,
    { name: 'RSA-OAEP' },
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function createAad({ spaceId, entityType, recordId, schemaVersion = 1, keyVersion = 1 }) {
  return new TextEncoder().encode(
    JSON.stringify([CRYPTO_VERSION, schemaVersion, spaceId, entityType, recordId, keyVersion])
  );
}

export async function encryptPayload(spaceKey, payload, metadata) {
  const iv = randomBytes(12);
  const ciphertext = await getCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: createAad(metadata), tagLength: 128 },
    spaceKey,
    new TextEncoder().encode(JSON.stringify(payload))
  );

  return {
    ciphertext: bytesToBase64(ciphertext),
    iv: bytesToBase64(iv),
    cryptoVersion: CRYPTO_VERSION,
    schemaVersion: metadata.schemaVersion ?? 1,
    keyVersion: metadata.keyVersion ?? 1,
  };
}

export async function decryptPayload(spaceKey, envelope, metadata) {
  const plaintext = await getCrypto().subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(envelope.iv),
      additionalData: createAad({
        ...metadata,
        schemaVersion: envelope.schemaVersion,
        keyVersion: envelope.keyVersion,
      }),
      tagLength: 128,
    },
    spaceKey,
    base64ToBytes(envelope.ciphertext)
  );

  return JSON.parse(new TextDecoder().decode(plaintext));
}

export function createInvitationSecret() {
  return bytesToBase64(randomBytes(32));
}

export async function encryptSpaceKeyForInvitation(spaceKey, secret, metadata) {
  const subtle = getCrypto().subtle;
  const inviteKey = await subtle.importKey(
    'raw',
    base64ToBytes(secret),
    { name: 'AES-GCM' },
    false,
    ['wrapKey']
  );
  const iv = randomBytes(12);
  const wrapped = await subtle.wrapKey('raw', spaceKey, inviteKey, {
    name: 'AES-GCM',
    iv,
    additionalData: new TextEncoder().encode(JSON.stringify(metadata)),
  });
  return { encryptedSpaceKey: bytesToBase64(wrapped), iv: bytesToBase64(iv) };
}

export async function decryptInvitationSpaceKey(envelope, secret, metadata) {
  const subtle = getCrypto().subtle;
  const inviteKey = await subtle.importKey(
    'raw',
    base64ToBytes(secret),
    { name: 'AES-GCM' },
    false,
    ['unwrapKey']
  );
  return subtle.unwrapKey(
    'raw',
    base64ToBytes(envelope.encryptedSpaceKey),
    inviteKey,
    {
      name: 'AES-GCM',
      iv: base64ToBytes(envelope.iv),
      additionalData: new TextEncoder().encode(JSON.stringify(metadata)),
    },
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function sha256Base64(value) {
  const digest = await getCrypto().subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToBase64(digest);
}

export { CRYPTO_VERSION };
