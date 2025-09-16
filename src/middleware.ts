
import { NextResponse, type NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function middleware(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  // If the user is not logged in, redirect them to the login page.
  if (session.isLoggedIn !== true) {
    // Store the original URL they were trying to access.
    const from = request.nextUrl.pathname;
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', from);

    return NextResponse.redirect(url);
  }

  // If the user is logged in, allow them to proceed.
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/config/:path*',
};
