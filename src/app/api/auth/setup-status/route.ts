import { api, setupAvailable } from '@/lib/authorization';
export const GET = api('setup', null, async () => Response.json({ setupAvailable: await setupAvailable() }));
