import type { NextRequest } from 'next/server';
import { reverse } from 'dns/promises';

function normaliseIp(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0]?.trim();
    return ip ? normaliseIp(ip) : null;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return normaliseIp(realIp.trim());
  }

  return request.ip ? normaliseIp(request.ip) : null;
}

export async function resolveClientHostname(request: NextRequest): Promise<string> {
  const ip = getClientIp(request);
  if (!ip) {
    return '';
  }

  try {
    const hostnames = await reverse(ip);
    return hostnames[0] ?? '';
  } catch (error) {
    console.warn(`Reverse DNS lookup failed for IP ${ip}:`, (error as Error).message);
    return '';
  }
}
