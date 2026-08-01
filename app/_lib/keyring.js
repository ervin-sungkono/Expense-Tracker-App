import { generateUserKeyring, recoverPrivateKey } from '@lib/crypto';
import { savePrivateKey } from '@lib/keyStore';
import { base64ToBytea, byteaToBase64 } from '@lib/supabase/binary';

export async function createUserKeyring(supabase, user, passphrase) {
    const keyVersion = 1;
    const generated = await generateUserKeyring(passphrase);
    const { error: publicKeyError } = await supabase.from('user_public_keys').insert({
        user_id: user.id,
        key_version: keyVersion,
        algorithm: 'RSA-OAEP-3072-SHA256',
        public_key_jwk: generated.publicKeyJwk,
        fingerprint: generated.fingerprint,
    });
    if (publicKeyError) throw publicKeyError;

    const { error: backupError } = await supabase.from('user_private_key_backups').insert({
        user_id: user.id,
        key_version: keyVersion,
        encrypted_private_key: base64ToBytea(generated.backup.encrypted_private_key),
        iv: base64ToBytea(generated.backup.iv),
        salt: base64ToBytea(generated.backup.salt),
        kdf_algorithm: generated.backup.kdf_algorithm,
        kdf_iterations: generated.backup.kdf_iterations,
        key_algorithm: generated.backup.key_algorithm,
    });
    if (backupError) throw backupError;

    const { error: profileError } = await supabase
        .from('profiles')
        .update({ active_key_version: keyVersion })
        .eq('id', user.id);
    if (profileError) throw profileError;

    await savePrivateKey(user.id, keyVersion, generated.privateKey);
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
