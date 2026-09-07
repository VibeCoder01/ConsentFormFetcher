import { sandboxEnabled } from '@/lib/sandbox';
import { feedback } from '@/lib/diagnostics';
import { api, validSetupToken } from '@/lib/authorization';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateAndAuthorise, checkMachineAuthorisation } from '@/ai/flows/ad-auth-flow';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth';
import { cookies } from 'next/headers';
import { resolveClientHostname } from '@/lib/client-machine';

const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

async function login(req: Request) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const { username, password } = parsed.data;

    if (username === 'setup' || (sandboxEnabled() && username === 'demo')) {
      if (!await validSetupToken(password)) return NextResponse.json({ message: 'Invalid setup credentials.' }, { status: 401 });
      const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
      session.username = 'setup';
      session.roles = ['full', 'change', 'read'];
      session.isLoggedIn = true;
      session.isSetup = !sandboxEnabled();
      session.setupExpires = Date.now() + 15 * 60 * 1000;
      await session.save();
      return NextResponse.json({ message: 'Setup access granted.', destination: sandboxEnabled() ? '/' : '/config' });
    }
    const hostname = await resolveClientHostname(req);
    const machineCheck = await checkMachineAuthorisation(hostname);

    if (!machineCheck.ok) {
      return NextResponse.json({ message: machineCheck.reason }, { status: 403 });
    }

    const authResult = await authenticateAndAuthorise({ username, password, hostname });

    if (!authResult.ok) {
      return NextResponse.json({ message: authResult.reason }, { status: 401 });
    }
    
    // Get session and save data
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    session.isSetup = false;
    delete session.setupExpires;
    session.username = authResult.username;
    session.roles = authResult.roles;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ message: 'Authentication successful' });
  } catch (error) {
    await feedback('failed', { error });
    const message = 'Operation failed. See the feedback log for diagnostic details.';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export const POST = api('login', null, login);
