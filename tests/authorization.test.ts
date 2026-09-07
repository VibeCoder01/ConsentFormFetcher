import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: {} as Record<string, unknown>, config: { groupDNs: { full: 'configured' } } }));
vi.mock('next/headers', () => ({ cookies: async () => ({}) }));
vi.mock('iron-session', () => ({ getIronSession: async () => mocks.session }));
vi.mock('@/lib/ad-config', async importOriginal => ({ ...await importOriginal<object>(), readAdConfig: async () => mocks.config }));
import { api, requireAccess } from '@/lib/authorization';
import { POST as updateAd } from '@/app/api/config/ad/route';
import { GET as demographics } from '@/app/api/koms/route';
import { POST as upload } from '@/app/api/upload/route';
import { POST as restore } from '@/app/api/config/backup/route';

describe('server access boundaries', () => {
  beforeEach(() => { mocks.session = {}; mocks.config.groupDNs.full = 'configured'; });
  afterEach(() => vi.unstubAllEnvs());
  it.each([['AD update', updateAd], ['patient lookup', demographics], ['upload', upload], ['restore', restore]] as const)('denies unauthenticated %s before side effects', async (_name, handler) => {
    const response = await handler(new Request('http://localhost/api/test', { method: handler === demographics ? 'GET' : 'POST' }));
    expect(response.status).toBe(401);
  });
  it('denies AD updates and full restores to change administrators', async () => {
    mocks.session = { isLoggedIn: true, roles: ['read', 'change'] };
    expect((await updateAd(new Request('http://localhost/api/config/ad', { method: 'POST' }))).status).toBe(403);
    expect((await restore(new Request('http://localhost/api/config/backup', { method: 'POST' }))).status).toBe(403);
  });
  it('permits the role hierarchy and blocks cross-origin writes', async () => {
    mocks.session = { isLoggedIn: true, roles: ['full'] };
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const endpoint = api('config', 'change', handler);
    expect((await endpoint(new Request('http://localhost/api/config', { method: 'POST' }))).status).toBe(200);
    expect((await endpoint(new Request('http://localhost/api/config', { method: 'POST', headers: { Origin: 'https://other.test' } }))).status).toBe(403);
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('limits setup sessions to configuration, expires them and closes setup once configured', async () => {
    vi.stubEnv('SETUP_TOKEN', 's'.repeat(40));
    mocks.config.groupDNs.full = '';
    mocks.session = { isLoggedIn: true, roles: ['full'], isSetup: true, setupExpires: Date.now() + 10000 };
    await expect(requireAccess('full', true)).resolves.toBeDefined();
    await expect(requireAccess('read')).rejects.toThrow('Access denied');
    mocks.session.setupExpires = Date.now() - 1;
    await expect(requireAccess('full', true)).rejects.toThrow();
    mocks.session.setupExpires = Date.now() + 10000;
    mocks.config.groupDNs.full = 'configured';
    await expect(requireAccess('full', true)).rejects.toThrow();
  });
});
