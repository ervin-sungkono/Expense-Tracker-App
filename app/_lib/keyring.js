import { generateDeviceKeyring, recoverPrivateKey } from '@lib/crypto';
import { savePrivateKey } from '@lib/keyStore';
import { byteaToBase64 } from '@lib/supabase/binary';

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

export async function recoverUserKeyring(supabase, user, keyVersion, passphrase) {
  const { data, error } = await supabase
    .from('user_private_key_backups')
    .select('encrypted_private_key,iv,salt,kdf_iterations')
    .eq('user_id', user.id)
    .eq('key_version', keyVersion)
    .single();
  if (error) throw error;

  const privateKey = await recoverPrivateKey(passphrase, {
    encrypted_private_key: byteaToBase64(data.encrypted_private_key),
    iv: byteaToBase64(data.iv),
    salt: byteaToBase64(data.salt),
    kdf_iterations: data.kdf_iterations,
  });
  await savePrivateKey(user.id, keyVersion, privateKey);
  return privateKey;
}
