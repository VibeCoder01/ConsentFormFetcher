
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { SessionData } from '@/lib/types';

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
  const [isInSetupMode, setIsInSetupMode] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function fetchSetupStatus() {
        try {
            const response = await fetch('/api/auth/setup-status');
            const data = await response.json();
            setIsInSetupMode(data.isInSetupMode);
        } catch (error) {
            console.error("Failed to fetch setup status", error);
            // Default to not being in setup mode on error to be safe
            setIsInSetupMode(false);
        }
    }
    fetchSetupStatus();
  }, []);

  useEffect(() => {
    // Wait until we know the setup mode status
    if (isInSetupMode === null) {
      return;
    }

    async function fetchSession() {
      if (isInSetupMode) {
        setSession(setupModeSession);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/session');
        if (!response.ok) {
            throw new Error('Session check failed');
        }
        const data = await response.json();

        if (data.isLoggedIn === true) {
            setSession(data);
        } else {
            // Not logged in, replace current history entry and redirect to login page.
            router.replace(`/login?from=${pathname}`);
        }

      } catch (error) {
        console.error('Failed to fetch session:', error);
        // Also redirect on any fetch error.
        router.replace(`/login?from=${pathname}`);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSession();
  }, [isInSetupMode, pathname, router]);

  return { session, isLoading: isLoading || isInSetupMode === null };
}
