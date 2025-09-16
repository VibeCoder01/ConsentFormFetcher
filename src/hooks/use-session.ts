
import { useState, useEffect } from 'react';
import type { SessionData } from '@/lib/types';

type SessionHookResult = {
  session: (SessionData & { isLoggedIn: true }) | { isLoggedIn: false };
  isLoading: boolean;
};

export function useSession(): SessionHookResult {
  const [session, setSession] = useState<(SessionData & { isLoggedIn: true }) | { isLoggedIn: false }>({ isLoggedIn: false });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        setSession(data);
      } catch (error) {
        console.error('Failed to fetch session:', error);
        setSession({ isLoggedIn: false });
      } finally {
        setIsLoading(false);
      }
    }

    fetchSession();
  }, []);

  return { session, isLoading };
}
