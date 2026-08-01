import { base64ToBytes, bytesToBase64 } from '@lib/crypto';

export function base64ToBytea(base64) {
    const bytes = base64ToBytes(base64);
    return `\\x${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function byteaToBase64(bytea) {
    if (!bytea) return null;
    if (!bytea.startsWith('\\x')) return bytea;
    const hex = bytea.slice(2);
    const bytes = new Uint8Array(hex.length / 2);
    for (let index = 0; index < hex.length; index += 2) {
        bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
    }
    return bytesToBase64(bytes);
}
