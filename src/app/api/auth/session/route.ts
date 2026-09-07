import { api, requireAccess } from '@/lib/authorization';
export const GET = api('session', null, async () => {
  try {
    const session = await requireAccess('read', true);
    return Response.json({ isLoggedIn: true, username: session.username, roles: session.roles, isSetup: session.isSetup });
  } catch { return Response.json({ isLoggedIn: false }); }
});
