import { NextResponse, type NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  if (session.isLoggedIn !== true) {
    const login = new URL('/login', request.url);
    login.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  if (session.isSetup && request.nextUrl.pathname === '/') return NextResponse.redirect(new URL('/config', request.url));
  return response;
}
export const config = { matcher: ['/((?!api|_next/static|_next/image|login|.*\\.).*)', '/'] };
