import { hasCookie } from "cookies-next";
import { NextResponse } from "next/server";

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|assets|pwa|favicon.ico|manifest.json).)',]
}

export default async function middleware(request) {
    const registered = await hasCookie('username', { req: request });

    if(request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/register') {
        if(registered) return NextResponse.redirect(new URL('/home', request.url));
    } else if (!registered) {
        return NextResponse.redirect(new URL('/register', request.url));
    }

    return NextResponse.next(request);
}