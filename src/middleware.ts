
import { NextResponse, type NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  // Fetch the setup mode status from our new API endpoint.
  // We need to use the absolute URL for fetches within middleware.
  const setupStatusUrl = new URL('/api/auth/setup-status', request.url);
  const setupStatusResponse = await fetch(setupStatusUrl);
  
  // If the status check fails, we can't determine if we're in setup mode.
  // It's safest to redirect to login with an error.
  if (!setupStatusResponse.ok) {
    console.error("Middleware error: Failed to fetch /api/auth/setup-status");
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    loginUrl.searchParams.set('error', 'middleware_error');
    return NextResponse.redirect(loginUrl);
  }

  const { isInSetupMode } = await setupStatusResponse.json();

  // If in initial setup mode, allow access to all pages so the admin can configure AD.
  if (isInSetupMode) {
      return NextResponse.next();
  }
  
  const session = await getIronSession<SessionData>(request.cookies, sessionOptions);

  // If NOT in setup mode, and user is not logged in, redirect them to the login page.
  if (session.isLoggedIn !== true) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is logged in, allow them to proceed.
  return NextResponse.next();
}

// This config applies the middleware to all routes except for the ones
// explicitly excluded (API routes, static files, and the login page itself).
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - login (the login page)
     * - any files with an extension (e.g. .ico, .json)
     */
    '/((?!api|_next/static|_next/image|login|.*\\.).*)',
    // Match the root path explicitly to be safe.
    '/',
  ],
};
