import { generateDeviceKeyring } from '@lib/crypto';
import { savePrivateKey } from '@lib/keyStore';

export async function createUserKeyring(supabase, user) {
  const keyVersion = 1;
  const generated = await generateDeviceKeyring();
  const { error: publicKeyError } = await supabase.from('user_public_keys').upsert(
    {
      user_id: user.id,
      key_version: keyVersion,
      algorithm: 'RSA-OAEP-3072-SHA256',
      public_key_jwk: generated.publicKeyJwk,
      fingerprint: generated.fingerprint,
    },
    { onConflict: 'user_id,key_version' }
  );
  if (publicKeyError) throw publicKeyError;

  await savePrivateKey(user.id, keyVersion, generated.privateKey);

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ active_key_version: keyVersion })
    .eq('id', user.id);
  if (profileError) throw profileError;

  return { keyVersion, privateKey: generated.privateKey, fingerprint: generated.fingerprint };
}
