import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabasePublicConfig } from './config';

export async function createClient() {
    const cookieStore = await cookies();
    const { url, publishableKey } = getSupabasePublicConfig();

    return createServerClient(url, publishableKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                } catch {
                    // Server Components cannot write cookies. Middleware refreshes them.
                }
            },
        },
    });
}

export function createSecretClient() {
    const { url } = getSupabasePublicConfig();
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!secretKey) {
        throw new Error('SUPABASE_SECRET_KEY is not configured.');
    }

    return createSupabaseClient(url, secretKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}
