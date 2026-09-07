import { describe, it, expect, afterEach, vi } from 'vitest';
import { allowedRemoteUrl, publicAddress } from '@/lib/remote-content';
afterEach(() => vi.unstubAllEnvs());
describe('source restrictions', () => {
  it.each(['http://www.rcr.ac.uk/a.pdf', 'https://localhost/a.pdf', 'https://www.rcr.ac.uk.evil.test/a.pdf', 'https://user:pass@www.rcr.ac.uk/a.pdf', 'https://www.rcr.ac.uk:444/a.pdf'])('rejects %s', url => expect(() => allowedRemoteUrl(url)).toThrow());
  it('accepts approved HTTPS hosts', () => expect(allowedRemoteUrl('https://www.rcr.ac.uk/a.pdf').hostname).toBe('www.rcr.ac.uk'));
  it.each(['127.0.0.1', '10.2.3.4', '169.254.169.254', '192.168.1.2', '172.16.0.1', '::1', '::ffff:127.0.0.1', 'fe80::1', 'fc00::1', '0.0.0.0'])('rejects non-public address %s', address => expect(publicAddress(address)).toBe(false));
  it('accepts a public address', () => expect(publicAddress('8.8.8.8')).toBe(true));
});
