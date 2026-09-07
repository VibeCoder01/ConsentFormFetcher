import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const mock = vi.hoisted(() => ({ config: { url: 'ldaps://directory.test', caFile: '', baseDN: 'dc=test', bindDN: 'service', bindPassword: 'synthetic-secret', groupDNs: { user: 'users', change: '', full: '' } }, bind: vi.fn(), search: vi.fn(), unbind: vi.fn(), options: vi.fn() }));
vi.mock('@/lib/ad-config', async original => ({ ...await original<object>(), readAdConfig: async () => mock.config }));
vi.mock('ldapts', () => ({ Client: class { constructor(options: unknown) { mock.options(options); } bind = mock.bind; search = mock.search; unbind = mock.unbind; } }));
vi.mock('@/lib/authorization', () => ({ api: (_name: string, _role: string, handler: (request: Request) => Promise<Response>) => handler }));
vi.mock('@/lib/app-config', () => ({ readAppConfig: async () => ({ validateRNumber: false }) }));
import { testAdConnection, authenticateAndAuthorise } from '@/ai/flows/ad-auth-flow';
import { resolveClientHostname } from '@/lib/client-machine';

beforeEach(() => { mock.config.url = 'ldaps://directory.test'; mock.bind.mockReset().mockResolvedValue(undefined); mock.search.mockReset().mockResolvedValue({ searchEntries: [] }); mock.unbind.mockReset().mockResolvedValue(undefined); mock.options.mockClear(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('directory and machine trust', () => {
  it('requires certificate verification without a custom CA', async () => {
    expect((await testAdConnection()).success).toBe(true);
    expect(mock.options).toHaveBeenCalledWith(expect.objectContaining({ tlsOptions: { rejectUnauthorized: true } }));
  });
  it('rejects plaintext LDAP before sending credentials', async () => {
    mock.config.url = 'ldap://directory.test';
    expect((await testAdConnection()).success).toBe(false);
    expect(mock.bind).not.toHaveBeenCalled();
  });
  it('closes failed directory connections', async () => {
    mock.search.mockRejectedValue(new Error('synthetic failure'));
    expect((await testAdConnection()).success).toBe(false);
    expect(mock.unbind).toHaveBeenCalledOnce();
  });
  it('does not admit directory users outside the required group', async () => {
    mock.search.mockResolvedValueOnce({ searchEntries: [{ dn: 'cn=synthetic' }] }).mockResolvedValue({ searchEntries: [] });
    expect((await authenticateAndAuthorise({ username: 'synthetic', password: 'synthetic' })).ok).toBe(false);
  });
  it('ignores forwarded headers unless explicitly configured and rejects loopback', async () => {
    vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', '');
    expect(await resolveClientHostname(new Request('http://local', { headers: { 'x-forwarded-for': '10.0.0.1', 'x-real-ip': '10.0.0.1' } }))).toBe('');
    vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', 'x-client-ip');
    expect(await resolveClientHostname(new Request('http://local', { headers: { 'x-client-ip': '127.0.0.1' } }))).toBe('');
  });
});
describe('KOMS contract', () => {
  it('rejects mismatched patient identifiers and does not return their demographics', async () => {
    vi.stubEnv('KOMS_URL', 'https://koms.test');
    vi.resetModules();
    const { GET } = await import('@/app/api/koms/route');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { headers: { Forename: 'Wrong', Surname: 'Patient', RNumber: 'TESTB' } })));
    const response = await GET(new Request('http://local/api/koms?RNumber=TESTA'));
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain('Wrong');
  });
  it('maps synthetic upstream headers and sets a timeout', async () => {
    vi.stubEnv('KOMS_URL', 'https://koms.test');
    vi.resetModules();
    const { GET } = await import('@/app/api/koms/route');
    const fetcher = vi.fn(async () => new Response('', { headers: { Forename: 'Alice', Surname: 'Synthetic', RNumber: 'TESTA', DoB: '17/05/1990' } }));
    vi.stubGlobal('fetch', fetcher);
    const response = await GET(new Request('http://local/api/koms?RNumber=TESTA'));
    expect(await response.json()).toMatchObject({ forename: 'Alice', rNumber: 'TESTA', dob: '1990-05-17' });
    expect(fetcher).toHaveBeenCalledWith('https://koms.test', expect.objectContaining({ signal: expect.any(AbortSignal), redirect: 'error' }));
  });
});
