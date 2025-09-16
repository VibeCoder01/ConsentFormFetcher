import { NextResponse, type NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth';
import { getAdConfigForSetup } from './lib/ad-config-loader';


export async function middleware(request: NextRequest) {
  // Read the AD config on the server to check for setup mode.
  const adConfig = await getAdConfigForSetup();
  
  // If the 'full' access group DN is not set or is a placeholder, assume initial setup and bypass auth for config pages.
  const isSetupMode = !adConfig.groupDNs.full || adConfig.groupDNs.full === "CN=AppAdmins-Full,OU=Groups,DC=domain,DC=com";

  if (isSetupMode) {
    if (request.nextUrl.pathname.startsWith('/config')) {
      return NextResponse.next();
    }
  }
  
  const session = await getIronSession<SessionData>(request.cookies, sessionOptions);

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
