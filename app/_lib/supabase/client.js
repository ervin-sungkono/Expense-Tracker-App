import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicConfig } from './config';

let browserClient;

export function createClient() {
    if (!browserClient) {
        const { url, publishableKey } = getSupabasePublicConfig();
        browserClient = createBrowserClient(url, publishableKey);
    }

    return browserClient;
}
