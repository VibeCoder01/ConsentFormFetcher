import type { NextRequest } from 'next/server';

const DEFAULT_USER_AGENT = 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0)';

function extractClientIp(request: NextRequest): string | null {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        const [first] = forwardedFor.split(',');
        if (first) {
            const ip = first.trim();
            if (ip) {
                return ip;
            }
        }
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp && realIp.trim()) {
        return realIp.trim();
    }

    const forwarded = request.headers.get('forwarded');
    if (forwarded) {
        const match = forwarded.match(/for=([^;]+)/i);
        if (match && match[1]) {
            return match[1].replace(/^"|"$/g, '');
        }
    }

    return null;
}

export function buildKomsRequestHeaders(request?: NextRequest): Headers {
    const headers = new Headers({
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': DEFAULT_USER_AGENT,
    });

    if (!request) {
        return headers;
    }

    const cookieHeader = request.headers.get('cookie') ?? request.headers.get('Cookie');
    if (cookieHeader && cookieHeader.trim()) {
        headers.set('Cookie', cookieHeader);
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.trim()) {
        headers.set('Authorization', authHeader);
    }

    const forwardedFor = extractClientIp(request);
    if (forwardedFor) {
        headers.set('X-Forwarded-For', forwardedFor);
    }

    const forwardedHost = request.headers.get('x-forwarded-host');
    if (forwardedHost && forwardedHost.trim()) {
        headers.set('X-Forwarded-Host', forwardedHost);
    }

    const forwardedProto = request.headers.get('x-forwarded-proto');
    if (forwardedProto && forwardedProto.trim()) {
        headers.set('X-Forwarded-Proto', forwardedProto);
    }

    return headers;
}
