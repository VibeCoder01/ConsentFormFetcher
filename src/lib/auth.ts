import type { SessionOptions } from 'iron-session';
import type { SessionData } from './types';

export type { SessionData } from './types';

export const sessionOptions: SessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD === 'replace-with-a-long-random-secret' ? '' : (process.env.SECRET_COOKIE_PASSWORD || ''),
  ttl: 8 * 60 * 60,
  cookieName: 'consent-form-fetcher-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60,
  },
};

// This is where we specify the typings for `session`.
declare module 'iron-session' {
  interface IronSessionData {
    username?: SessionData['username'];
    roles?: SessionData['roles'];
    isLoggedIn?: SessionData['isLoggedIn'];
  }
}
