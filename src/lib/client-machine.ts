import type { NextRequest } from 'next/server';
import { reverse } from 'dns/promises';
import { hostname as getOsHostname } from 'os';

function normaliseIp(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function isLoopbackIp(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1';
}

function getLocalMachineHostname(): string {
  return getOsHostname().trim().toLowerCase();
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

  return null;
}

export async function resolveClientHostname(request: NextRequest): Promise<string> {
  const ip = getClientIp(request);
  if (!ip) {
    return '';
  }

  if (isLoopbackIp(ip)) {
    return getLocalMachineHostname();
  }

  try {
    const hostnames = await reverse(ip);
    const resolved = hostnames[0]?.trim().toLowerCase() ?? '';
    if (!resolved || resolved === 'localhost') {
      return getLocalMachineHostname();
    }
    return resolved;
  } catch (error) {
    console.warn(`Reverse DNS lookup failed for IP ${ip}:`, (error as Error).message);
    return '';
  }
}
