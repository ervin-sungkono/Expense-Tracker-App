import Dexie from 'dexie';

class KeyStore extends Dexie {
  constructor() {
    super('XpensedKeyStore');
    this.version(2).stores({
      deviceKeys: '&userId',
      spaceKeys: '[userId+spaceId+keyVersion], userId, spaceId, keyVersion',
    });
  }
}

export const keyStore = new KeyStore();

export async function savePrivateKey(userId, privateKey) {
  await keyStore.deviceKeys.put({ userId, privateKey });
}

export async function getPrivateKey(userId) {
  return (await keyStore.deviceKeys.get(userId))?.privateKey ?? null;
}

export async function saveSpaceKey(userId, spaceId, keyVersion, spaceKey) {
  await keyStore.spaceKeys.put({ userId, spaceId, keyVersion, spaceKey });
}

export async function getSpaceKey(userId, spaceId, keyVersion) {
  return (await keyStore.spaceKeys.get([userId, spaceId, keyVersion]))?.spaceKey ?? null;
}

export async function clearUserKeys(userId) {
  await keyStore.transaction('rw', keyStore.deviceKeys, keyStore.spaceKeys, async () => {
    await keyStore.deviceKeys.delete(userId);
    await keyStore.spaceKeys.where('userId').equals(userId).delete();
  });
}
