import { reverse, lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export async function resolveClientHostname(request: Request): Promise<string> {
  // Enable only behind a proxy that overwrites this header and prevents direct
  // backend access. Never consume the client-controlled X-Forwarded-For chain.
  const header = process.env.TRUSTED_CLIENT_IP_HEADER?.toLowerCase();
  if (!header || header === 'x-forwarded-for') return '';
  const raw = request.headers.get(header)?.trim() || '';
  const ip = raw.startsWith('::ffff:') ? raw.slice(7) : raw;
  if (!isIP(ip) || ip === '127.0.0.1' || ip === '::1') return '';
  try {
    const hostnames = await reverse(ip);
    for (const hostname of hostnames) {
      const addresses = await lookup(hostname, { all: true });
      if (addresses.some(address => address.address === ip)) return hostname.toLowerCase().replace(/\.$/, '');
    }
  } catch { /* An unresolved machine is never authorised. */ }
  return '';
}
