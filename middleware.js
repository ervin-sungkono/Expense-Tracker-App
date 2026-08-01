import { updateSession } from './app/_lib/supabase/middleware';

export async function middleware(request) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icons|category_icons|sw.js|workbox-).*)',
  ],
};
