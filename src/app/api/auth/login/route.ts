
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateAndAuthorise } from '@/ai/flows/ad-auth-flow';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth';
import { cookies } from 'next/headers';

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

    const authResult = await authenticateAndAuthorise({ username, password });

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
