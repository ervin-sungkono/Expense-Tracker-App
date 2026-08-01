import { generateDeviceKeyring } from '@lib/crypto';
import { savePrivateKey } from '@lib/keyStore';

export async function createUserKeyring(supabase, user) {
  const generated = await generateDeviceKeyring();
  const { error: publicKeyError } = await supabase.from('user_public_keys').upsert(
    {
      user_id: user.id,
      algorithm: 'RSA-OAEP-3072-SHA256',
      public_key_jwk: generated.publicKeyJwk,
      fingerprint: generated.fingerprint,
    },
    { onConflict: 'user_id' }
  );
  if (publicKeyError) throw publicKeyError;

  await savePrivateKey(user.id, generated.privateKey);

  return { privateKey: generated.privateKey, fingerprint: generated.fingerprint };
}
