import type { SessionOptions } from 'iron-session';
import type { SessionData } from './types';

export type { SessionData } from './types';

export const sessionOptions: SessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD as string,
  cookieName: 'consent-form-fetcher-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: undefined,
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
