
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateAndAuthorise } from '@/ai/flows/ad-auth-flow';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth';
import { cookies } from 'next/headers';
import { reverse } from 'dns/promises';

const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const { username, password } = parsed.data;

    let hostname = '';
    const ip = req.ip;

    if (ip) {
      try {
        // Reverse DNS lookup to get the hostname from the client's IP address.
        // This returns an array of hostnames, we take the first one.
        const hostnames = await reverse(ip);
        hostname = hostnames[0];
      } catch (e) {
        console.warn(`Reverse DNS lookup failed for IP ${ip}:`, (e as Error).message);
        // If lookup fails, we proceed with an empty hostname.
        // The auth flow will deny access if machine MFA is required.
      }
    }

    const authResult = await authenticateAndAuthorise({ username, password, hostname });

    if (!authResult.ok) {
      return NextResponse.json({ message: authResult.reason }, { status: 401 });
    }
    
    // Get session and save data
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    session.username = authResult.username;
    session.roles = authResult.roles;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ message: 'Authentication successful' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
