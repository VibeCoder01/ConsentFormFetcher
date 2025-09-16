
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { sessionOptions, SessionData } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (session.isLoggedIn !== true) {
    return NextResponse.json({
      isLoggedIn: false,
    });
  }

  return NextResponse.json({
    isLoggedIn: true,
    username: session.username,
    roles: session.roles,
  });
}
