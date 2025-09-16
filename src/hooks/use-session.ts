
import { useState, useEffect } from 'react';
import type { SessionData } from '@/lib/types';
import adConfig from '@/config/ad.json';

type SessionHookResult = {
  session: (SessionData & { isLoggedIn: true }) | { isLoggedIn: false };
  isLoading: boolean;
};

const setupModeSession: SessionData & { isLoggedIn: true } = {
  isLoggedIn: true,
  username: 'setup-admin',
  roles: ['full', 'change', 'read'],
};

export function useSession(): SessionHookResult {
  const [session, setSession] = useState<(SessionData & { isLoggedIn: true }) | { isLoggedIn: false }>({ isLoggedIn: false });
  const [isLoading, setIsLoading] = useState(true);

  // Enter setup mode if the full access group is missing or is still the default placeholder.
  const isInSetupMode = !adConfig.groupDNs.full || adConfig.groupDNs.full === "CN=AppAdmins-Full,OU=Groups,DC=domain,DC=com";

  useEffect(() => {
    async function fetchSession() {
      if (isInSetupMode) {
        setSession(setupModeSession);
        setIsLoading(false);
        return;
      }

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
  }, [isInSetupMode]);

  return { session, isLoading };
}
