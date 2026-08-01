import Dexie from 'dexie';

class KeyStore extends Dexie {
  constructor() {
    super('XpensedKeyStore');
    this.version(1).stores({
      privateKeys: '[userId+keyVersion], userId, keyVersion',
      spaceKeys: '[userId+spaceId+keyVersion], userId, spaceId, keyVersion',
    });
  }
}

export const keyStore = new KeyStore();

export async function savePrivateKey(userId, keyVersion, privateKey) {
  await keyStore.privateKeys.put({ userId, keyVersion, privateKey });
}

export async function getPrivateKey(userId, keyVersion) {
  return (await keyStore.privateKeys.get([userId, keyVersion]))?.privateKey ?? null;
}

export async function saveSpaceKey(userId, spaceId, keyVersion, spaceKey) {
  await keyStore.spaceKeys.put({ userId, spaceId, keyVersion, spaceKey });
}

export async function getSpaceKey(userId, spaceId, keyVersion) {
  return (await keyStore.spaceKeys.get([userId, spaceId, keyVersion]))?.spaceKey ?? null;
}

export async function clearUserKeys(userId) {
  await keyStore.transaction('rw', keyStore.privateKeys, keyStore.spaceKeys, async () => {
    await keyStore.privateKeys.where('userId').equals(userId).delete();
    await keyStore.spaceKeys.where('userId').equals(userId).delete();
  });
}
