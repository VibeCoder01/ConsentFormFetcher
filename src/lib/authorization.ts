import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { timingSafeEqual } from 'node:crypto';
import { sessionOptions } from './auth';
import type { AccessLevel, SessionData } from './types';
import { readAdConfig } from './ad-config';
import { feedback, trace } from './diagnostics';

export class AccessError extends Error {
  constructor(public status: number) { super(status === 401 ? 'Please sign in.' : 'Access denied.'); }
}
export async function setupAvailable() {
  const config = await readAdConfig();
  return Boolean(process.env.SETUP_TOKEN && process.env.SETUP_TOKEN.length >= 32 && (!config.groupDNs.full || config.groupDNs.full === 'CN=AppAdmins-Full,OU=Groups,DC=domain,DC=com'));
}
export async function validSetupToken(value: string) {
  const expected = process.env.SETUP_TOKEN || '';
  return await setupAvailable() && Buffer.byteLength(value) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
export async function requireAccess(role: AccessLevel = 'read', allowSetup = false) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) throw new AccessError(401);
  if (session.isSetup && (!allowSetup || !await setupAvailable() || !session.setupExpires || Date.now() > session.setupExpires)) throw new AccessError(403);
  const rank = { read: 1, change: 2, full: 3 };
  if (!session.roles?.some(r => rank[r] >= rank[role])) throw new AccessError(403);
  return session;
}
export function api(operation: string, role: AccessLevel | null, handler: (request: Request) => Promise<Response>, allowSetup = false) {
  return (request: Request) => trace(operation, async () => {
    try {
      // Cookie-authenticated writes must originate from this site. Non-browser
      // administrative tools may omit Origin, but still need a valid session.
      const origin = request.headers.get('origin');
      const expectedOrigin = process.env.APP_ORIGIN || new URL(request.url).origin;
      if (!['GET', 'HEAD'].includes(request.method) && origin && origin !== expectedOrigin) throw new AccessError(403);
      if (role) await requireAccess(role, allowSetup);
      const response = await handler(request);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    } catch (error) {
      const status = error instanceof AccessError ? error.status : 500;
      await feedback(status === 500 ? 'failed' : 'denied', { status, error });
      return Response.json({ message: status === 500 ? 'Operation failed. See the feedback log for diagnostic details.' : (error as AccessError).message }, { status, headers: { 'Cache-Control': 'no-store' } });
    }
  });
}
